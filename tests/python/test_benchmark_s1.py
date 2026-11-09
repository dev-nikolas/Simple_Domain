"""
Pruebas automatizadas para Benchmark S1.
Verifica determinismo, separación de conjuntos, ausencia de filtración y estructura de escenarios.
"""

from simple_domain.experiments.benchmark_s1 import BenchmarkS1Generator, generate_benchmark_s1


def test_benchmark_determinism_with_same_seed():
    """Dos generadores con la misma semilla deben producir exactamente los mismos datos."""
    gen1 = BenchmarkS1Generator(seed=123)
    ds1 = gen1.generate(n_fit=50, n_calibration=20, n_evaluation=50)

    gen2 = BenchmarkS1Generator(seed=123)
    ds2 = gen2.generate(n_fit=50, n_calibration=20, n_evaluation=50)

    assert len(ds1.fit_set) == len(ds2.fit_set) == 50
    assert len(ds1.calibration_set) == len(ds2.calibration_set) == 20
    assert len(ds1.evaluation_set) == len(ds2.evaluation_set) == 50

    for obs1, obs2 in zip(ds1.fit_set, ds2.fit_set):
        assert obs1.obs_id == obs2.obs_id
        assert obs1.features == obs2.features
        assert obs1.scenario == obs2.scenario
        assert obs1.is_anomaly == obs2.is_anomaly

    for obs1, obs2 in zip(ds1.evaluation_set, ds2.evaluation_set):
        assert obs1.obs_id == obs2.obs_id
        assert obs1.features == obs2.features
        assert obs1.scenario == obs2.scenario


def test_benchmark_variation_with_different_seed():
    """Semillas distintas deben producir observaciones diferentes."""
    ds1 = generate_benchmark_s1(seed=1, n_fit=30, n_calib=10, n_eval=30)
    ds2 = generate_benchmark_s1(seed=2, n_fit=30, n_calib=10, n_eval=30)

    # Al menos una característica de la primera observación debe diferir
    feat1 = ds1.fit_set[0].features
    feat2 = ds2.fit_set[0].features
    assert feat1 != feat2


def test_no_label_leakage_and_clean_splits():
    """
    Verifica que fit_set y calibration_set solo contengan observaciones normales (is_anomaly=False)
    y que los IDs de los tres conjuntos sean mutuamente disjuntos.
    """
    ds = generate_benchmark_s1(seed=42, n_fit=100, n_calib=50, n_eval=150)

    # 1. En fit_set y calibration_set no hay anomalías
    assert all(not obs.is_anomaly for obs in ds.fit_set)
    assert all(obs.scenario == "normal_known" for obs in ds.fit_set)
    assert all(not obs.is_anomaly for obs in ds.calibration_set)
    assert all(obs.scenario == "normal_known" for obs in ds.calibration_set)

    # 2. Conjuntos estrictamente disjuntos
    fit_ids = {obs.obs_id for obs in ds.fit_set}
    calib_ids = {obs.obs_id for obs in ds.calibration_set}
    eval_ids = {obs.obs_id for obs in ds.evaluation_set}

    assert len(fit_ids) == 100
    assert len(calib_ids) == 50
    assert len(eval_ids) == 150
    assert fit_ids.isdisjoint(calib_ids)
    assert fit_ids.isdisjoint(eval_ids)
    assert calib_ids.isdisjoint(eval_ids)


def test_all_scenarios_present_in_evaluation():
    """El conjunto de evaluación debe contener todos los escenarios sintéticos esperados."""
    ds = generate_benchmark_s1(seed=42, n_fit=50, n_calib=20, n_eval=200)
    scenarios_present = {obs.scenario for obs in ds.evaluation_set}

    expected_scenarios = {
        "normal_known",
        "legit_variation",
        "novelty_regime",
        "point_anomaly",
        "contextual_anomaly",
        "incoherent_noise",
    }
    assert expected_scenarios == scenarios_present
