import pytest
from simple_domain.brain import analyze_dataset
from simple_domain.brain.analyzers.short_numeric import analyze_series
from simple_domain.brain.models import NormalizedDataset, NormalizedSeries


def test_brain_constant_sequence():
    series = NormalizedSeries(
        name="temp_constant",
        values=[5.0, 5.0, 5.0, 5.0, 5.0],
        raw_count=5,
        excluded_count=0,
        has_nulls=False,
    )
    match = analyze_series(series)
    assert match.pattern_type == "constant"
    assert match.parameters["constant_value"] == 5.0
    assert match.statistics.min_value == 5.0
    assert match.statistics.max_value == 5.0
    assert match.statistics.std_dev == 0.0


def test_brain_arithmetic_progression_positive_and_negative():
    # Paso positivo +2
    s_pos = NormalizedSeries(
        name="prog_pos",
        values=[2.0, 4.0, 6.0, 8.0, 10.0, 12.0],
        raw_count=6,
        excluded_count=0,
        has_nulls=False,
    )
    match_pos = analyze_series(s_pos)
    assert match_pos.pattern_type == "arithmetic_progression"
    assert match_pos.parameters["step"] == 2.0
    assert match_pos.statistics.mean == 7.0

    # Paso negativo -3
    s_neg = NormalizedSeries(
        name="prog_neg",
        values=[15.0, 12.0, 9.0, 6.0, 3.0],
        raw_count=5,
        excluded_count=0,
        has_nulls=False,
    )
    match_neg = analyze_series(s_neg)
    assert match_neg.pattern_type == "arithmetic_progression"
    assert match_neg.parameters["step"] == -3.0


def test_brain_irregular_sequence_not_falsely_labeled():
    s_irreg = NormalizedSeries(
        name="irreg",
        values=[2.0, 5.0, 7.0, 12.0, 13.0, 21.0],
        raw_count=6,
        excluded_count=0,
        has_nulls=False,
    )
    match = analyze_series(s_irreg)
    assert match.pattern_type == "irregular_variation"
    assert "no satisface progresión" in match.description or "las diferencias no son constantes" in match.description
    assert match.statistics.count == 6


def test_brain_insufficient_data():
    s_short = NormalizedSeries(
        name="too_short",
        values=[10.0, 20.0],
        raw_count=2,
        excluded_count=0,
        has_nulls=False,
    )
    match = analyze_series(s_short)
    assert match.pattern_type == "insufficient_data"
    assert "insuficiente" in match.description.lower()
    assert len(match.warnings) > 0


def test_brain_analyze_dataset_full():
    ds = NormalizedDataset(
        dataset_name="demo.csv",
        format_type="csv",
        row_count=4,
        column_names=["a", "b"],
        column_types={"a": "numeric", "b": "numeric"},
        numeric_series=[
            NormalizedSeries("a", [1.0, 2.0, 3.0, 4.0], 4, 0, False),
            NormalizedSeries("b", [9.0, 9.0, 9.0, 9.0], 4, 0, False),
        ],
    )
    result = analyze_dataset(ds)
    assert result.engine_version == "0.1.0"
    assert result.total_series_analyzed == 2
    assert result.summary["pattern_distribution"]["arithmetic_progression"] == 1
    assert result.summary["pattern_distribution"]["constant"] == 1
