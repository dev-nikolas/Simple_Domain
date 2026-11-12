use relic_core::Sampler;

#[test]
fn test_sample_top_k_deterministic_greedy_on_low_temp() {
    let logits = vec![1.0, 5.0, 2.0, 10.0, -3.0];
    let (chosen, _) = Sampler::sample_top_k(&logits, 3, 0.001, 12345);
    assert_eq!(chosen, 3); // logit 10.0 en índice 3
}

#[test]
fn test_sample_top_k_constrains_to_top_candidates() {
    // 50 tokens: solo los índices 0, 1, 2 tienen logits altos (20.0, 19.0, 18.0)
    // El resto tiene logits extremadamente bajos (-50.0)
    let mut logits = vec![-50.0f32; 50];
    logits[0] = 20.0;
    logits[1] = 19.0;
    logits[2] = 18.0;

    let mut state = 42u64;
    for _ in 0..100 {
        let (token, next_state) = Sampler::sample_top_k(&logits, 3, 0.8, state);
        state = next_state;
        assert!(token <= 2, "Token seleccionado ({token}) no está en los Top-3");
    }
}

#[test]
fn test_sample_top_k_handles_extreme_logits_without_nan() {
    let logits = vec![1000.0, 999.0, -1000.0, 500.0];
    let (token, _) = Sampler::sample_top_k(&logits, 2, 0.5, 999);
    assert!(token == 0 || token == 1);
}

