import argparse
import json
from pathlib import Path
from typing import Any

from training.model_registry import read_registry, update_model_status


def load_metrics(path_value: str | None) -> dict[str, Any]:
    if not path_value:
        raise ValueError("metrics_path manquant.")

    path = Path(path_value)

    if not path.exists():
        raise FileNotFoundError(f"metrics.json introuvable : {path}")

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def extract_metric(metrics_payload: dict[str, Any], metric_name: str) -> float:
    if metric_name in metrics_payload:
        return float(metrics_payload.get(metric_name) or 0)

    nested_metrics = metrics_payload.get("metrics") or {}
    return float(nested_metrics.get(metric_name) or 0)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Comparer une candidate recommendation avec la version production."
    )

    parser.add_argument("--candidate-version", required=True)
    parser.add_argument("--min-ndcg-delta", type=float, default=0.001)
    parser.add_argument("--auto-reject", action="store_true")

    args = parser.parse_args()

    registry = read_registry()

    task_entry = registry.get("models", {}).get("recommendation")
    if not task_entry:
        raise ValueError("Aucune entrée recommendation dans le registry.")

    active_version = task_entry.get("active_version")
    versions = task_entry.get("versions", {})

    if not active_version:
        raise ValueError("Aucune version production active.")

    if active_version not in versions:
        raise ValueError(f"Version active introuvable : {active_version}")

    if args.candidate_version not in versions:
        raise ValueError(f"Candidate introuvable : {args.candidate_version}")

    production = versions[active_version]
    candidate = versions[args.candidate_version]

    if candidate.get("status") != "candidate":
        raise ValueError(
            f"La version {args.candidate_version} n’est pas en statut candidate. "
            f"Statut actuel : {candidate.get('status')}"
        )

    production_metrics = load_metrics(production.get("metrics_path"))
    candidate_metrics = load_metrics(candidate.get("metrics_path"))

    prod_ndcg = extract_metric(production_metrics, "ndcg_at_5")
    cand_ndcg = extract_metric(candidate_metrics, "ndcg_at_5")

    prod_precision = extract_metric(production_metrics, "precision_at_5")
    cand_precision = extract_metric(candidate_metrics, "precision_at_5")

    ndcg_delta = cand_ndcg - prod_ndcg
    precision_delta = cand_precision - prod_precision

    print("\n=== Recommendation Candidate Comparison ===")
    print(f"Production version       : {active_version}")
    print(f"Candidate version        : {args.candidate_version}")
    print("")
    print(f"Production ndcg_at_5     : {prod_ndcg}")
    print(f"Candidate ndcg_at_5      : {cand_ndcg}")
    print(f"NDCG delta               : {ndcg_delta}")
    print("")
    print(f"Production precision_at_5: {prod_precision}")
    print(f"Candidate precision_at_5 : {cand_precision}")
    print(f"Precision delta          : {precision_delta}")

    is_better = ndcg_delta >= args.min_ndcg_delta

    if is_better:
        print("\n✅ Candidate meilleure selon le seuil défini.")
        print(
            "Commande de promotion : "
            f"python -m training.promote_model --task recommendation --version {args.candidate_version}"
        )
        return

    reason = (
        f"Candidate non promue : ndcg_delta={ndcg_delta}, "
        f"precision_delta={precision_delta}, "
        f"min_required_ndcg_delta={args.min_ndcg_delta}."
    )

    print("\n❌ Candidate non meilleure. Ne pas promouvoir.")

    if args.auto_reject:
        update_model_status(
            task="recommendation",
            version=args.candidate_version,
            status="rejected",
            reason=reason
        )
        print("Candidate marquée comme rejected dans le registry.")


if __name__ == "__main__":
    main()