use relic_core::{KvCache, RelicConfig, RelicModel};

#[test]
fn test_kv_cache_persistence_and_selective_logits_prefill() {
    let mut config = RelicConfig::default();
    config.vocab_size = 128;
    config.hidden_size = 64;
    config.head_dim = 16;
    config.num_attention_heads = 4;
    config.num_key_value_heads = 2;
    config.intermediate_size = 128;
    config.num_hidden_layers = 2;
    config.max_position_embeddings = 64;
    config.max_train_seq_len = 32;

    assert!(config.validate().is_ok());

    let model = RelicModel::new(config.clone());
    let mut cache = KvCache::new(
        config.num_hidden_layers,
        config.max_train_seq_len,
        config.num_key_value_heads,
        config.head_dim,
    );

    let prompt_tokens = vec![12u32, 34, 56];
    let mut prefill_logits = vec![0.0f32; config.vocab_size];

    // Prefill: pos 0 y 1 sin calcular logits (None), pos 2 con logits (Some)
    for (pos, &tid) in prompt_tokens.iter().enumerate() {
        let is_last = pos == prompt_tokens.len() - 1;
        model.forward_decode_step_ex(
            tid,
            pos,
            &mut cache,
            if is_last {
                Some(&mut prefill_logits)
            } else {
                None
            },
        );
    }

    // El cache debe tener exactamente 3 tokens acumulados
    assert_eq!(cache.current_len, 3);

    // Los logits finales de prefill deben haberse calculado
    assert!(
        prefill_logits.iter().any(|&v| v != 0.0),
        "Prefill logits no deben ser todos ceros en el último token"
    );

    // Generar siguiente token autoregresivo
    let mut decode_logits = vec![0.0f32; config.vocab_size];
    let next_token = 78u32;
    let pos = cache.current_len;
    model.forward_decode_step_ex(next_token, pos, &mut cache, Some(&mut decode_logits));

    // El cache debe haber avanzado a 4
    assert_eq!(cache.current_len, 4);

    // Los tensores K y V en la capa 0 deben estar poblados para las posiciones 0..4
    let kv_dim = config.num_key_value_heads * config.head_dim;
    for pos_idx in 0..4 {
        let start = pos_idx * kv_dim;
        let end = start + kv_dim;
        let k_slice = &cache.layers[0].k_cache[start..end];
        assert!(
            k_slice.iter().any(|&val| val != 0.0),
            "K cache en pos {pos_idx} debe estar poblado"
        );
    }

    // La posición 4 debe permanecer en ceros (aún no escrita)
    let start_pos4 = 4 * kv_dim;
    let end_pos4 = start_pos4 + kv_dim;
    let k_slice_pos4 = &cache.layers[0].k_cache[start_pos4..end_pos4];
    assert!(
        k_slice_pos4.iter().all(|&val| val == 0.0),
        "K cache en pos 4 debe seguir en ceros"
    );
}

