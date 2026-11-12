use relic_tokenizer::byte_level::{bytes_to_unicode, text_to_bytelevel, ByteLevelStreamDecoder};

#[test]
fn test_utf8_streaming_decoder_retains_and_emits_multibyte_spanish() {
    let (b2c, c2b) = bytes_to_unicode();
    let mut decoder = ByteLevelStreamDecoder::new();

    // La palabra "año" en UTF-8 tiene los bytes: 'a' (0x61), 'ñ' (0xC3, 0xB1), 'o' (0x6F)
    let original = "año";
    let encoded_chars = text_to_bytelevel(original, &b2c);
    let chars: Vec<char> = encoded_chars.chars().collect();
    assert_eq!(chars.len(), 4); // 4 bytes

    // Simular streaming token a token (cada token entrega 1 caracter mapeado)
    let chunk0 = decoder.decode_chunk(&chars[0].to_string(), &c2b);
    assert_eq!(chunk0, "a");

    // Primer byte de 'ñ' (0xC3) -> incompleto, debe retener y emitir string vacío
    let chunk1 = decoder.decode_chunk(&chars[1].to_string(), &c2b);
    assert_eq!(chunk1, "");

    // Segundo byte de 'ñ' (0xB1) -> completa la secuencia UTF-8 válida, debe emitir "ñ"
    let chunk2 = decoder.decode_chunk(&chars[2].to_string(), &c2b);
    assert_eq!(chunk2, "ñ");

    // Byte final 'o' (0x6F)
    let chunk3 = decoder.decode_chunk(&chars[3].to_string(), &c2b);
    assert_eq!(chunk3, "o");
}

#[test]
fn test_utf8_streaming_decoder_flush_partial() {
    let (b2c, c2b) = bytes_to_unicode();
    let mut decoder = ByteLevelStreamDecoder::new();

    // Enviar solo primer byte de 'é' (0xC3)
    let encoded_chars = text_to_bytelevel("é", &b2c);
    let chars: Vec<char> = encoded_chars.chars().collect();
    let chunk0 = decoder.decode_chunk(&chars[0].to_string(), &c2b);
    assert_eq!(chunk0, "");

    // Flush final emite el carácter de reemplazo en lugar de trabarse o lanzar panic
    let flushed = decoder.flush();
    assert!(!flushed.is_empty());
}

