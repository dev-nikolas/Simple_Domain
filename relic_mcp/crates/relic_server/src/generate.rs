//! # relic_server::generate
//!
//! Generación autorregresiva causal con emisión Server-Sent Events (SSE) token a token.
use std::time::Instant;
use relic_core::{KvCache, Sampler};
use crate::state::ServerState;
use crate::types::SseTokenChunk;

pub fn handle_generate_sse(prompt_text: &str, state: &ServerState) -> Vec<u8> {
    let t0 = Instant::now();
    let mut buffer = Vec::new();

    if let (Some(model), Some(tokenizer)) = (&state.model, &state.tokenizer) {
        let token_ids = tokenizer.encode(prompt_text);
        if token_ids.is_empty() {
            let final_chunk = SseTokenChunk {
                token: String::new(),
                token_id: 0,
                finished: true,
                route: Some("empty_prompt".to_string()),
                latency_ms: Some(t0.elapsed().as_nanos() as f64 / 1_000_000.0),
            };
            if let Ok(json_str) = serde_json::to_string(&final_chunk) {
                buffer.extend_from_slice(format!("data: {}\n\n", json_str).as_bytes());
            }
            return buffer;
        }

        let mut kv_cache = KvCache::new(
            state.config.num_hidden_layers,
            state.config.max_train_seq_len,
            state.config.num_key_value_heads,
            state.config.head_dim,
        );
        let mut step_logits = vec![0.0f32; state.config.vocab_size];

        // Prefill optimizado: se omite la proyección LM-Head en tokens intermedios
        for (pos, &tid) in token_ids.iter().enumerate() {
            let is_last = pos == token_ids.len() - 1;
            model.forward_decode_step_ex(
                tid,
                pos,
                &mut kv_cache,
                if is_last { Some(&mut step_logits) } else { None },
            );
        }

        let max_budget = state.config.max_train_seq_len.saturating_sub(token_ids.len()).min(128);
        let mut generated_text = String::new();
        let mut stream_decoder = tokenizer.create_stream_decoder();
        let mut rng_state = 1337u64;
        const STOP_SEQUENCES: [&str; 4] = ["<|box_end|>", "<|im_end|>", "<|endoftext|>", "<|eot_id|>"];

        for _ in 0..max_budget {
            let (next_token, next_rng) = Sampler::sample_top_k(&step_logits, 40, 0.3, rng_state);
            rng_state = next_rng;
            if tokenizer.vocab().is_eos(next_token) {
                break;
            }
            let token_str = tokenizer.decode_token_stream(next_token, &mut stream_decoder);
            generated_text.push_str(&token_str);

            const MAX_STOP_LEN: usize = 16;
            let check_start = generated_text.len().saturating_sub(MAX_STOP_LEN + token_str.len());
            let tail = &generated_text[check_start..];
            if STOP_SEQUENCES.iter().any(|&seq| tail.contains(seq)) {
                break;
            }

            let chunk = SseTokenChunk {
                token: token_str,
                token_id: next_token,
                finished: false,
                route: None,
                latency_ms: None,
            };
            if let Ok(json_str) = serde_json::to_string(&chunk) {
                buffer.extend_from_slice(format!("data: {}\n\n", json_str).as_bytes());
            }

            let pos = kv_cache.current_len;
            if pos >= state.config.max_train_seq_len {
                break;
            }
            model.forward_decode_step_ex(next_token, pos, &mut kv_cache, Some(&mut step_logits));
        }

        let final_chunk = SseTokenChunk {
            token: String::new(),
            token_id: 0,
            finished: true,
            route: Some("neural_model".to_string()),
            latency_ms: Some(t0.elapsed().as_nanos() as f64 / 1_000_000.0),
        };
        if let Ok(json_str) = serde_json::to_string(&final_chunk) {
            buffer.extend_from_slice(format!("data: {}\n\n", json_str).as_bytes());
        }
    } else {
        let degraded_msg = "RELIC [Modo degradado]: Pesos Safetensors no cargados. Inferencia causal en espera.";
        let chunk = SseTokenChunk {
            token: degraded_msg.to_string(),
            token_id: 0,
            finished: false,
            route: None,
            latency_ms: None,
        };
        if let Ok(json_str) = serde_json::to_string(&chunk) {
            buffer.extend_from_slice(format!("data: {}\n\n", json_str).as_bytes());
        }

        let final_chunk = SseTokenChunk {
            token: String::new(),
            token_id: 0,
            finished: true,
            route: Some("degraded_mode".to_string()),
            latency_ms: Some(t0.elapsed().as_nanos() as f64 / 1_000_000.0),
        };
        if let Ok(json_str) = serde_json::to_string(&final_chunk) {
            buffer.extend_from_slice(format!("data: {}\n\n", json_str).as_bytes());
        }
    }

    buffer
}
