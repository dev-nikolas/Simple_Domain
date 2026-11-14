#!/usr/bin/env python3
"""
export_safetensors.py / export_relic.py
======================================
Exporter connecting the Python training ecosystem with the C99 inference engine.
Serializes PyTorch / HuggingFace Safetensors checkpoints into the high-performance
.relic binary container format (and vice-versa).

Features:
- Detects Frontier Governor architecture (presence of Wa_proj and W_sym).
- Injects RELIC_FEATURE_FRONTIER_GOVERNOR (1 << 4) into header flags.
- Serializes governor tensors: governor.Wa, governor.W_sym, governor.b_sym,
  governor.probe_w, governor.probe_b.
- Backward-compatible standard model export without governor flags or extra tensors.
- 64-byte RelicFileHeader (magic 0x52454C43 / 0x52454C49), 96-byte descriptors, 64-byte aligned data.
"""

import argparse
import os
import struct
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import torch

try:
    from safetensors.torch import save_file, load_file
    HAS_SAFETENSORS = True
except ImportError:
    HAS_SAFETENSORS = False

# Binary Format Constants
RELIC_MAGIC_RELC = 0x52454C43  # "RELC" Little-Endian
RELIC_MAGIC_RELI = 0x52454C49  # "RELI" Little-Endian
RELIC_FORMAT_VERSION = 1
RELIC_ALIGNMENT = 64

# Feature Flags
RELIC_FEATURE_FRONTIER_GOVERNOR = (1 << 4)

# Data Types
RELIC_DTYPE_TERNARY_2BIT = 0
RELIC_DTYPE_INT8 = 1
RELIC_DTYPE_FLOAT32 = 2
RELIC_DTYPE_INT8_ROW = 3


def align64(x: int) -> int:
    """Align byte offset to 64 bytes."""
    return (x + 63) & ~63


class TensorEntry:
    def __init__(self, name: str, rows: int, cols: int, data: np.ndarray, dtype: int = RELIC_DTYPE_FLOAT32, scale: float = 1.0):
        self.name = name
        self.rows = int(rows)
        self.cols = int(cols)
        self.dtype = int(dtype)
        self.scale = float(scale)
        # Ensure contiguous float32 in CPU memory
        self.data = np.ascontiguousarray(data, dtype=np.float32)
        self.offset = 0
        self.size_bytes = self.rows * self.cols * 4


def detect_frontier_governor(state_dict: Dict[str, Any]) -> bool:
    """
    Detect if the model contains Frontier Governor architecture
    by checking for Wa_proj and W_sym in the state dict.
    """
    keys = list(state_dict.keys())
    has_wa = any("Wa_proj" in k or k == "governor.Wa" for k in keys)
    has_wsym = any("W_sym" in k or k == "governor.W_sym" for k in keys)
    return bool(has_wa and has_wsym)


def find_tensor_in_dict(state_dict: Dict[str, Any], candidates: List[str]) -> Optional[torch.Tensor]:
    """Search for the first matching key among candidate names."""
    for c in candidates:
        if c in state_dict:
            t = state_dict[c]
            return t if isinstance(t, torch.Tensor) else torch.tensor(t)
    # Substring search if exact match not found
    for c in candidates:
        for k in state_dict.keys():
            if k.endswith(c) or c in k:
                t = state_dict[k]
                return t if isinstance(t, torch.Tensor) else torch.tensor(t)
    return None


def extract_governor_tensors(
    state_dict: Dict[str, Any],
    hidden_dim: int
) -> List[TensorEntry]:
    """
    Extract and format the 5 Frontier Governor tensors:
    - governor.Wa: [hidden_dim, hidden_dim]
    - governor.W_sym: [hidden_dim, hidden_dim]
    - governor.b_sym: [hidden_dim, 1]
    - governor.probe_w: [hidden_dim, 1]
    - governor.probe_b: [1, 1]
    """
    # 1. governor.Wa
    t_wa = find_tensor_in_dict(state_dict, ["governor.Wa", "Wa_proj.weight", "model.Wa_proj.weight", "Wa_proj"])
    if t_wa is None:
        raise ValueError("Frontier Governor detected but Wa_proj tensor not found!")
    wa_arr = t_wa.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, hidden_dim)

    # 2. governor.W_sym
    t_wsym = find_tensor_in_dict(state_dict, ["governor.W_sym", "W_sym.weight", "model.W_sym.weight", "W_sym"])
    if t_wsym is None:
        raise ValueError("Frontier Governor detected but W_sym tensor not found!")
    wsym_arr = t_wsym.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, hidden_dim)

    # 3. governor.b_sym
    t_bsym = find_tensor_in_dict(state_dict, ["governor.b_sym", "b_sym.weight", "b_sym.bias", "model.b_sym.weight", "model.b_sym.bias", "b_sym"])
    if t_bsym is not None:
        bsym_arr = t_bsym.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, 1)
    else:
        bsym_arr = np.zeros((hidden_dim, 1), dtype=np.float32)

    # 4. governor.probe_w
    t_probew = find_tensor_in_dict(state_dict, ["governor.probe_w", "probe.weight", "model.probe.weight", "probe_weights", "probe_w"])
    if t_probew is not None:
        probew_arr = t_probew.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, 1)
    else:
        probew_arr = np.zeros((hidden_dim, 1), dtype=np.float32)

    # 5. governor.probe_b
    t_probeb = find_tensor_in_dict(state_dict, ["governor.probe_b", "probe.bias", "model.probe.bias", "probe_bias", "probe_b"])
    if t_probeb is not None:
        probeb_val = float(t_probeb.detach().cpu().to(torch.float32).reshape(-1)[0])
        probeb_arr = np.array([[probeb_val]], dtype=np.float32)
    else:
        probeb_arr = np.zeros((1, 1), dtype=np.float32)

    return [
        TensorEntry("governor.Wa", hidden_dim, hidden_dim, wa_arr),
        TensorEntry("governor.W_sym", hidden_dim, hidden_dim, wsym_arr),
        TensorEntry("governor.b_sym", hidden_dim, 1, bsym_arr),
        TensorEntry("governor.probe_w", hidden_dim, 1, probew_arr),
        TensorEntry("governor.probe_b", 1, 1, probeb_arr),
    ]


def export_relic_binary(
    state_dict: Dict[str, Any],
    config: Dict[str, Any],
    output_path: str,
    magic: int = RELIC_MAGIC_RELC,
    force_frontier: Optional[bool] = None
) -> int:
    """
    Serializes a model state dict into a .relic binary file according to C99 specifications.
    """
    is_frontier = detect_frontier_governor(state_dict) if force_frontier is None else force_frontier

    num_layers = int(config.get("num_layers", config.get("n_layer", 6)))
    hidden_dim = int(config.get("hidden_dim", config.get("dim", 512)))
    inter_dim = int(config.get("intermediate_dim", config.get("inter_dim", hidden_dim * 2)))
    num_heads = int(config.get("num_heads", config.get("n_head", 8)))
    num_kv_heads = int(config.get("num_kv_heads", config.get("n_kv_head", num_heads)))
    vocab_size = int(config.get("vocab_size", 512))
    max_seq_len = int(config.get("max_seq_len", 1024))
    head_dim = hidden_dim // (num_heads if num_heads else 1)
    kv_dim = (hidden_dim * num_kv_heads) // (num_heads if num_heads else 1)
    rope_theta = float(config.get("rope_theta", 1000000.0))
    rms_norm_eps = float(config.get("rms_norm_eps", 1e-6))

    flags = int(config.get("flags", 0))
    if is_frontier:
        flags |= RELIC_FEATURE_FRONTIER_GOVERNOR

    entries: List[TensorEntry] = []

    # 1. Global core tensors
    # Embedding
    t_emb = find_tensor_in_dict(state_dict, ["tok_embeddings.weight", "model.embed_tokens.weight", "embed.weight", "tok_embeddings"])
    if t_emb is not None:
        emb_data = t_emb.detach().cpu().to(torch.float32).numpy().reshape(vocab_size, hidden_dim)
    else:
        emb_data = np.zeros((vocab_size, hidden_dim), dtype=np.float32)
    entries.append(TensorEntry("tok_embeddings.weight", vocab_size, hidden_dim, emb_data))

    # Output norm
    t_norm = find_tensor_in_dict(state_dict, ["output_norm.weight", "model.norm.weight", "final_norm.gamma", "output_norm"])
    if t_norm is not None:
        norm_data = t_norm.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, 1)
    else:
        norm_data = np.ones((hidden_dim, 1), dtype=np.float32)
    entries.append(TensorEntry("output_norm.weight", hidden_dim, 1, norm_data))

    # Output (lm_head)
    t_head = find_tensor_in_dict(state_dict, ["output.weight", "lm_head.weight", "output"])
    if t_head is not None:
        head_data = t_head.detach().cpu().to(torch.float32).numpy().reshape(vocab_size, hidden_dim)
    else:
        head_data = emb_data  # weight tying fallback
    entries.append(TensorEntry("output.weight", vocab_size, hidden_dim, head_data))

    # 2. Per-layer tensors
    for l in range(num_layers):
        l_prefix = f"blk.{l}."
        # attn_norm
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}attn_norm.weight", f"layers.{l}.input_layernorm.weight", f"blocks.{l}.attn_norm.gamma"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, 1) if t is not None else np.ones((hidden_dim, 1), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}attn_norm.weight", hidden_dim, 1, d))

        # ffn_norm
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}ffn_norm.weight", f"layers.{l}.post_attention_layernorm.weight", f"blocks.{l}.ffn_norm.gamma"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, 1) if t is not None else np.ones((hidden_dim, 1), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}ffn_norm.weight", hidden_dim, 1, d))

        # attn_q
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}attn_q.weight", f"layers.{l}.self_attn.q_proj.weight", f"blocks.{l}.attn.W_q"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, hidden_dim) if t is not None else np.zeros((hidden_dim, hidden_dim), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}attn_q.weight", hidden_dim, hidden_dim, d))

        # attn_k
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}attn_k.weight", f"layers.{l}.self_attn.k_proj.weight", f"blocks.{l}.attn.W_k"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(kv_dim, hidden_dim) if t is not None else np.zeros((kv_dim, hidden_dim), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}attn_k.weight", kv_dim, hidden_dim, d))

        # attn_v
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}attn_v.weight", f"layers.{l}.self_attn.v_proj.weight", f"blocks.{l}.attn.W_v"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(kv_dim, hidden_dim) if t is not None else np.zeros((kv_dim, hidden_dim), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}attn_v.weight", kv_dim, hidden_dim, d))

        # attn_out
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}attn_out.weight", f"layers.{l}.self_attn.o_proj.weight", f"blocks.{l}.attn.W_out"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, hidden_dim) if t is not None else np.zeros((hidden_dim, hidden_dim), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}attn_out.weight", hidden_dim, hidden_dim, d))

        # ffn_gate
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}ffn_gate.weight", f"layers.{l}.mlp.gate_proj.weight", f"blocks.{l}.ffn.W_gate"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(inter_dim, hidden_dim) if t is not None else np.zeros((inter_dim, hidden_dim), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}ffn_gate.weight", inter_dim, hidden_dim, d))

        # ffn_up
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}ffn_up.weight", f"layers.{l}.mlp.up_proj.weight", f"blocks.{l}.ffn.W_up"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(inter_dim, hidden_dim) if t is not None else np.zeros((inter_dim, hidden_dim), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}ffn_up.weight", inter_dim, hidden_dim, d))

        # ffn_down
        t = find_tensor_in_dict(state_dict, [f"{l_prefix}ffn_down.weight", f"layers.{l}.mlp.down_proj.weight", f"blocks.{l}.ffn.W_down"])
        d = t.detach().cpu().to(torch.float32).numpy().reshape(hidden_dim, inter_dim) if t is not None else np.zeros((hidden_dim, inter_dim), dtype=np.float32)
        entries.append(TensorEntry(f"{l_prefix}ffn_down.weight", hidden_dim, inter_dim, d))

    # 3. Frontier Governor tensors (only if is_frontier is True)
    if is_frontier:
        gov_entries = extract_governor_tensors(state_dict, hidden_dim)
        entries.extend(gov_entries)

    num_tensors = len(entries)

    # 4. Compute byte offsets with 64-byte alignment
    cur_offset = align64(64 + num_tensors * 96)
    for e in entries:
        e.offset = cur_offset
        e.size_bytes = e.rows * e.cols * 4
        cur_offset = align64(cur_offset + e.size_bytes)
    total_size = cur_offset

    # 5. Serialize binary file
    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(output_path, "wb") as f:
        # Header (64 bytes): <IIIIIIIIIIQffII
        header_bytes = struct.pack(
            "<IIIIIIIIIIQffII",
            magic,
            RELIC_FORMAT_VERSION,
            num_layers,
            hidden_dim,
            inter_dim,
            num_heads,
            num_kv_heads,
            vocab_size,
            max_seq_len,
            num_tensors,
            total_size,
            rope_theta,
            rms_norm_eps,
            flags,
            head_dim
        )
        assert len(header_bytes) == 64, f"Header size mismatch: {len(header_bytes)} != 64"
        f.write(header_bytes)

        # Descriptors (96 bytes per tensor): <64sIIIfQQ
        for e in entries:
            name_bytes = e.name.encode("utf-8")[:63].ljust(64, b"\x00")
            desc_bytes = struct.pack(
                "<64sIIIfQQ",
                name_bytes,
                e.dtype,
                e.rows,
                e.cols,
                e.scale,
                e.offset,
                e.size_bytes
            )
            assert len(desc_bytes) == 96, f"Descriptor size mismatch: {len(desc_bytes)} != 96"
            f.write(desc_bytes)

        # Data payloads aligned to 64 bytes
        for e in entries:
            curr_pos = f.tell()
            if e.offset > curr_pos:
                f.write(b"\x00" * (e.offset - curr_pos))
            f.write(e.data.tobytes())

        # Final file alignment padding
        curr_pos = f.tell()
        if total_size > curr_pos:
            f.write(b"\x00" * (total_size - curr_pos))

    print(f"Exported .relic binary: {output_path} ({total_size} bytes, {num_tensors} tensors, Frontier={is_frontier})")
    return total_size


def generate_mock_frontier_state_dict(
    hidden_dim: int = 64,
    inter_dim: int = 128,
    num_layers: int = 2,
    vocab_size: int = 128,
    with_frontier: bool = True,
    attractor_scale: float = 10.0
) -> Tuple[Dict[str, torch.Tensor], Dict[str, Any]]:
    """Generates synthetic PyTorch state dict and config for testing."""
    config = {
        "num_layers": num_layers,
        "hidden_dim": hidden_dim,
        "intermediate_dim": inter_dim,
        "num_heads": 4,
        "num_kv_heads": 4,
        "vocab_size": vocab_size,
        "max_seq_len": 256,
        "rope_theta": 1000000.0,
        "rms_norm_eps": 1e-6,
        "flags": 0
    }

    state_dict: Dict[str, torch.Tensor] = {}
    torch.manual_seed(42)

    # Core embeddings and norms
    state_dict["tok_embeddings.weight"] = torch.randn(vocab_size, hidden_dim, dtype=torch.float32)
    state_dict["output_norm.weight"] = torch.ones(hidden_dim, 1, dtype=torch.float32)
    state_dict["output.weight"] = torch.randn(vocab_size, hidden_dim, dtype=torch.float32)

    # Layer weights
    for l in range(num_layers):
        state_dict[f"blk.{l}.attn_norm.weight"] = torch.ones(hidden_dim, 1, dtype=torch.float32)
        state_dict[f"blk.{l}.ffn_norm.weight"] = torch.ones(hidden_dim, 1, dtype=torch.float32)
        state_dict[f"blk.{l}.attn_q.weight"] = torch.randn(hidden_dim, hidden_dim, dtype=torch.float32) * 0.02
        state_dict[f"blk.{l}.attn_k.weight"] = torch.randn(hidden_dim, hidden_dim, dtype=torch.float32) * 0.02
        state_dict[f"blk.{l}.attn_v.weight"] = torch.randn(hidden_dim, hidden_dim, dtype=torch.float32) * 0.02
        state_dict[f"blk.{l}.attn_out.weight"] = torch.randn(hidden_dim, hidden_dim, dtype=torch.float32) * 0.02
        state_dict[f"blk.{l}.ffn_gate.weight"] = torch.randn(inter_dim, hidden_dim, dtype=torch.float32) * 0.02
        state_dict[f"blk.{l}.ffn_up.weight"] = torch.randn(inter_dim, hidden_dim, dtype=torch.float32) * 0.02
        state_dict[f"blk.{l}.ffn_down.weight"] = torch.randn(hidden_dim, inter_dim, dtype=torch.float32) * 0.02

    if with_frontier:
        # Wa_proj: random orthogonal projection
        q, _ = torch.linalg.qr(torch.randn(hidden_dim, hidden_dim, dtype=torch.float32))
        state_dict["Wa_proj.weight"] = q

        # W_sym: continuous symmetric Hopfield matrix (eigenvalues in negative/attractor spectrum)
        w_rand = torch.randn(hidden_dim, hidden_dim, dtype=torch.float32) * 0.1
        w_sym = 0.5 * (w_rand + w_rand.T)
        # Add diagonal to ensure attractive energy basin
        w_sym = w_sym + attractor_scale * torch.eye(hidden_dim, dtype=torch.float32)
        state_dict["W_sym.weight"] = w_sym

        # b_sym: bias vector
        state_dict["b_sym.weight"] = torch.randn(hidden_dim, 1, dtype=torch.float32) * 0.05

        # probe: anti-hallucination linear probe
        state_dict["probe.weight"] = torch.randn(hidden_dim, 1, dtype=torch.float32) * 0.1
        state_dict["probe.bias"] = torch.tensor([0.0], dtype=torch.float32)

    return state_dict, config


def export_checkpoint_to_safetensors(ckpt_path: Path, out_path: Path, fp16: bool = True) -> None:
    """Exports a PyTorch checkpoint to HuggingFace safetensors (backward-compatible utility)."""
    if not HAS_SAFETENSORS:
        raise ImportError("safetensors package is required for export_checkpoint_to_safetensors")
    state_dict = torch.load(str(ckpt_path), map_location="cpu", weights_only=False)
    if "state_dict" in state_dict:
        state_dict = state_dict["state_dict"]
    target_dict = {}
    for k, v in state_dict.items():
        if isinstance(v, torch.Tensor):
            target_dict[k] = v.half() if fp16 and v.dtype == torch.float32 else v
    save_file(target_dict, str(out_path))
    print(f"Exported safetensors: {out_path}")


def export_checkpoint_to_relic(
    ckpt_path: Path,
    out_path: Path,
    magic: int = RELIC_MAGIC_RELC,
    config: Optional[Dict[str, Any]] = None
) -> int:
    """Loads a PyTorch / Safetensors checkpoint and exports it directly to .relic format."""
    ckpt_str = str(ckpt_path)
    if ckpt_str.endswith(".safetensors") and HAS_SAFETENSORS:
        state_dict = load_file(ckpt_str)
    else:
        loaded = torch.load(ckpt_str, map_location="cpu", weights_only=False)
        if isinstance(loaded, dict) and "state_dict" in loaded:
            state_dict = loaded["state_dict"]
            if config is None and "config" in loaded:
                config = loaded["config"]
        else:
            state_dict = loaded

    if config is None:
        # Infer dimensions from tensors
        hidden_dim = 512
        for k, v in state_dict.items():
            if "tok_embeddings" in k:
                hidden_dim = v.shape[1]
                break
            elif "output_norm" in k:
                hidden_dim = v.shape[0]
                break
        config = {
            "num_layers": 6,
            "hidden_dim": hidden_dim,
            "intermediate_dim": hidden_dim * 2,
            "num_heads": 8,
            "num_kv_heads": 8,
            "vocab_size": 512,
            "max_seq_len": 1024
        }

    return export_relic_binary(state_dict, config, str(out_path), magic=magic)


def main():
    parser = argparse.ArgumentParser(description="RELIC Model Binary & Safetensors Exporter")
    parser.add_argument("--ckpt", type=str, help="Input checkpoint file (.pt or .safetensors)")
    parser.add_argument("--out", type=str, help="Output file path (.relic or .safetensors)")
    parser.add_argument("--format", type=str, choices=["relic", "safetensors"], default="relic")
    parser.add_argument("--magic", type=lambda x: int(x, 0), default=RELIC_MAGIC_RELC, help="Header magic (default 0x52454C43)")
    parser.add_argument("--mock", action="store_true", help="Generate synthetic mock model for testing")
    parser.add_argument("--frontier", action="store_true", default=True, help="Include Frontier Governor tensors in mock")
    parser.add_argument("--no-frontier", dest="frontier", action="store_false", help="Do not include Frontier Governor tensors")
    parser.add_argument("--hidden-dim", type=int, default=64, help="Hidden dimension for mock")
    parser.add_argument("--num-layers", type=int, default=2, help="Number of layers for mock")

    args = parser.parse_args()

    if args.mock:
        out_path = args.out if args.out else ("mock_frontier.relic" if args.frontier else "mock_standard.relic")
        print(f"Generating synthetic mock model (Frontier={args.frontier}, dim={args.hidden_dim}, layers={args.num_layers})...")
        state_dict, config = generate_mock_frontier_state_dict(
            hidden_dim=args.hidden_dim,
            inter_dim=args.hidden_dim * 2,
            num_layers=args.num_layers,
            vocab_size=128,
            with_frontier=args.frontier
        )
        export_relic_binary(state_dict, config, out_path, magic=args.magic)
        return

    if not args.ckpt or not args.out:
        parser.print_help()
        sys.exit(1)

    ckpt_path = Path(args.ckpt)
    out_path = Path(args.out)

    if args.format == "safetensors":
        export_checkpoint_to_safetensors(ckpt_path, out_path)
    else:
        export_checkpoint_to_relic(ckpt_path, out_path, magic=args.magic)


if __name__ == "__main__":
    main()
