//! Algoritmo de tokenizacion Byte-Pair Encoding (BPE) determinista Zero-Alloc.
use std::collections::HashMap;
use crate::byte_level::{bytelevel_to_text, bytes_to_unicode, text_to_bytelevel, ByteLevelStreamDecoder};
use crate::vocab::Vocab;

#[derive(Clone, Copy, Debug)]
struct Symbol {
    start: u32,
    end: u32,
    prev: i32,
    next: i32,
}

pub struct BpeTokenizer {
    vocab: Vocab,
    byte_to_char: HashMap<u8, char>,
    char_to_byte: HashMap<char, u8>,
}

impl BpeTokenizer {
    pub fn new(vocab: Vocab) -> Self {
        let (byte_to_char, char_to_byte) = bytes_to_unicode();
        Self {
            vocab,
            byte_to_char,
            char_to_byte,
        }
    }

    /// Aplica fusiones BPE mediante lista doblemente enlazada sobre arreglo plano sin mover memoria.
    fn bpe_merge<'a>(&self, piece: &'a str) -> Vec<&'a str> {
        let indices: Vec<(usize, char)> = piece.char_indices().collect();
        if indices.is_empty() {
            return Vec::new();
        }
        if indices.len() == 1 {
            return vec![piece];
        }

        let mut symbols: Vec<Symbol> = Vec::with_capacity(indices.len());
        for i in 0..indices.len() {
            let start = indices[i].0 as u32;
            let end = if i + 1 < indices.len() {
                indices[i + 1].0 as u32
            } else {
                piece.len() as u32
            };
            symbols.push(Symbol {
                start,
                end,
                prev: if i == 0 { -1 } else { (i - 1) as i32 },
                next: if i + 1 < indices.len() { (i + 1) as i32 } else { -1 },
            });
        }

        let first = 0i32;

        loop {
            let mut min_rank = u32::MAX;
            let mut best_left = -1i32;

            let mut curr = first;
            while curr != -1 {
                let right = symbols[curr as usize].next;
                if right == -1 {
                    break;
                }
                let left_slice = &piece[symbols[curr as usize].start as usize..symbols[curr as usize].end as usize];
                let right_slice = &piece[symbols[right as usize].start as usize..symbols[right as usize].end as usize];

                let pair = (left_slice.to_string(), right_slice.to_string());
                if let Some(&rank) = self.vocab.bpe_ranks.get(&pair) {
                    if rank < min_rank {
                        min_rank = rank;
                        best_left = curr;
                    }
                }
                curr = right;
            }

            if best_left == -1 {
                break;
            }

            let best_right = symbols[best_left as usize].next;
            if best_right == -1 {
                break;
            }

            // Fusión O(1): actualizar el final y puentear el nodo derecho
            symbols[best_left as usize].end = symbols[best_right as usize].end;
            let next_after_right = symbols[best_right as usize].next;
            symbols[best_left as usize].next = next_after_right;
            if next_after_right != -1 {
                symbols[next_after_right as usize].prev = best_left;
            }
        }

        let mut result = Vec::new();
        let mut curr = first;
        while curr != -1 {
            let sym = &symbols[curr as usize];
            result.push(&piece[sym.start as usize..sym.end as usize]);
            curr = sym.next;
        }
        result
    }

    /// Codifica un texto en una lista de token IDs enteros.
    pub fn encode(&self, text: &str) -> Vec<u32> {
        if text.is_empty() {
            return Vec::new();
        }

        let byte_repr = text_to_bytelevel(text, &self.byte_to_char);
        let pieces = self.bpe_merge(&byte_repr);

        let mut ids = Vec::with_capacity(pieces.len());
        for p in pieces {
            if let Some(&id) = self.vocab.token_to_id.get(p) {
                ids.push(id);
            } else {
                // Fallback a nivel de caracteres de bytes individuales
                for c in p.chars() {
                    let mut buf = [0u8; 4];
                    let cs = c.encode_utf8(&mut buf);
                    if let Some(&cid) = self.vocab.token_to_id.get(cs) {
                        ids.push(cid);
                    }
                }
            }
        }
        ids
    }

    /// Decodifica una secuencia de token IDs a la cadena de texto UTF-8 original.
    pub fn decode(&self, ids: &[u32]) -> Result<String, String> {
        let mut buffer = String::new();
        for &id in ids {
            if let Some(token_str) = self.vocab.id_to_token.get(&id) {
                if token_str.starts_with("<|") && token_str.ends_with("|>") {
                    continue;
                }
                buffer.push_str(token_str);
            }
        }
        bytelevel_to_text(&buffer, &self.char_to_byte)
            .map_err(|e| format!("Error decodificando UTF-8: {e}"))
    }

    /// Crea un decodificador de streaming con búfer acumulativo UTF-8.
    pub fn create_stream_decoder(&self) -> ByteLevelStreamDecoder {
        ByteLevelStreamDecoder::new()
    }

    /// Decodifica un solo token usando un decodificador de streaming acumulativo.
    pub fn decode_token_stream(&self, id: u32, decoder: &mut ByteLevelStreamDecoder) -> String {
        if let Some(token_str) = self.vocab.id_to_token.get(&id) {
            if token_str.starts_with("<|") && token_str.ends_with("|>") {
                return String::new();
            }
            decoder.decode_chunk(token_str, &self.char_to_byte)
        } else {
            String::new()
        }
    }

    pub fn vocab(&self) -> &Vocab {
        &self.vocab
    }
}
