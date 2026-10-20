"""
Offline evaluation: run the CV reviewer + the judge on 3 fictional sample CVs.

Run from the backend/ folder:   python -m evals.run_judge
It makes 6 AI calls (3 reviews + 3 judgements), so it costs a little money.

Why? When you change a prompt or a model, run this again and compare the scores.
If they drop, your change made the reviews worse.
"""
import csv
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # read .env BEFORE importing files that use the API key

from ai import JUDGE_MODEL, MODEL  # noqa: E402
from cv_reader import get_cv_text  # noqa: E402
from judge import CRITERIA, judge_cv_review  # noqa: E402
from routes.cv import run_cv_review  # noqa: E402

HERE = Path(__file__).parent          # the evals/ folder
SAMPLES_DIR = HERE / "samples"
RESULTS_FILE = HERE / "results.csv"

# Each sample = <name>_cv.txt + <name>_job.txt in samples/, plus the role
SAMPLES = [
    {"name": "strong", "job_role": "Junior Data Analyst"},
    {"name": "average", "job_role": "Junior AI Engineer"},
    {"name": "weak", "job_role": "DevOps Engineer"},
]

# Short column titles for the table
SHORT = {"factual_accuracy": "factual", "relevance": "relevance",
         "actionability": "action", "completeness": "complete"}


def main():
    print(f"Reviewer model: {MODEL} | Judge model: {JUDGE_MODEL}\n")
    rows = []

    for sample in SAMPLES:
        name = sample["name"]
        print(f"Running '{name}'... (review + judge)")
        cv_raw = (SAMPLES_DIR / f"{name}_cv.txt").read_text(encoding="utf-8")
        job_ad = (SAMPLES_DIR / f"{name}_job.txt").read_text(encoding="utf-8")

        try:
            cv = get_cv_text(None, cv_raw)  # same checks/limits as the app
            review = run_cv_review(cv, sample["job_role"], job_ad)
            evaluation = judge_cv_review(cv, sample["job_role"], job_ad, review)
        except Exception as err:
            # One failed sample should not stop the others
            print(f"  FAILED: {getattr(err, 'detail', err)}")
            continue

        # One row per sample: name, the 4 scores, overall, passed
        row = {"sample": name, "review_score": review.overall_score}
        for c in evaluation.criteria:
            row[c.criterion] = c.score
        row["overall"] = evaluation.overall_score
        row["passed"] = "yes" if evaluation.passed else "no"
        rows.append(row)

        # Show the problems the judge found (useful to improve the prompt)
        for c in evaluation.criteria:
            for issue in c.issues:
                print(f"  - {c.criterion}: {issue}")

    if not rows:
        print("\nNo results. Check your OPENAI_API_KEY in .env.")
        return

    # Print the table. :<9 = left-align in 9 characters, :>9 = right-align
    print()
    header = f"{'sample':<9}" + "".join(f"{SHORT[c]:>11}" for c in CRITERIA) + f"{'overall':>9}{'passed':>8}"
    print(header)
    print("-" * len(header))
    for row in rows:
        scores = "".join(f"{row[c]:>11}" for c in CRITERIA)
        print(f"{row['sample']:<9}{scores}{row['overall']:>9}{row['passed']:>8}")
    print("\n(review_score = the CV's own score out of 10, saved in the CSV)")

    # Save to CSV (open it in Excel or Google Sheets)
    columns = ["sample", "review_score", *CRITERIA, "overall", "passed"]
    with open(RESULTS_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved to {RESULTS_FILE}")


if __name__ == "__main__":
    main()
