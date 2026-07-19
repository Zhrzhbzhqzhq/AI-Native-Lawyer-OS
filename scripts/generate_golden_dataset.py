#!/usr/bin/env python3
"""Generate LawDesk Golden Dataset files from validated source JSON."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
GOLDEN_ROOT = REPOSITORY_ROOT / "test-data" / "golden"
SOURCE_ROOT = GOLDEN_ROOT / "source"

CASES = (
    "Case01_private_lending_principal",
    "Case02_interest_dispute",
    "Case03_wechat_evidence",
    "Case04_limitation_period",
    "Case05_contract_termination",
    "Case06_labor_dispute",
    "Case07_traffic_accident",
    "Case08_equity_investment",
    "Case09_product_liability",
    "Case10_full_litigation",
)

CASE_DIRECTORIES = (
    "01_客户资料",
    "02_案件材料",
    "03_对方观点",
    "04_案件目标",
    "05_Golden标准答案",
    "06_律师反馈",
    "07_测试记录",
)

SOURCE_FOLDER_NAMES = CASE_DIRECTORIES[:4]

GOLDEN_FILENAMES = {
    "Facts": "Facts.json",
    "Issues": "Issues.json",
    "Laws": "Laws.json",
    "Arguments": "Arguments.json",
    "DocumentExpectation": "DocumentExpectation.json",
}

CASE_BY_SOURCE_ID = {
    case_name[0].lower() + case_name[1:]: case_name for case_name in CASES
}

WriteResult = Literal["created", "updated", "preserved"]

README = """# LawDesk Golden Dataset

本目录用于保存经律师审核的 Golden Dataset 测试案件。

每个案件均按客户资料、案件材料、对方观点、案件目标、Golden 标准答案、律师反馈和测试记录分类管理。

生成命令：

```bash
python3 scripts/generate_golden_dataset.py
```

生成器只创建缺失文件，不覆盖已有案件材料、标准答案或测试记录。
"""

ANSWER_TEMPLATES: dict[str, Any] = {
    "Facts.json": {
        "case_id": "",
        "facts": [],
    },
    "Issues.json": {
        "case_id": "",
        "issues": [],
    },
    "Laws.json": {
        "case_id": "",
        "laws": [],
    },
    "Arguments.json": {
        "case_id": "",
        "arguments": [],
    },
    "DocumentExpectation.json": {
        "case_id": "",
        "documents": [],
        "required_sections": [],
        "forbidden_content": [],
    },
}


def write_text_if_missing(path: Path, content: str) -> bool:
    if path.exists():
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def write_json_if_missing(path: Path, payload: Any) -> bool:
    return write_text_if_missing(
        path,
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
    )


def write_text_if_empty(path: Path, content: str) -> WriteResult:
    """Write content only when the target is missing or empty."""
    existed = path.exists()
    if existed and path.stat().st_size > 0:
        return "preserved"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return "updated" if existed else "created"


def write_json_if_empty(path: Path, payload: Any) -> WriteResult:
    return write_text_if_empty(
        path,
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
    )


def load_source(source_path: Path) -> dict[str, Any]:
    with source_path.open(encoding="utf-8") as source_file:
        source = json.load(source_file)

    source_case_id = source.get("case_id")
    if source_case_id not in CASE_BY_SOURCE_ID:
        raise ValueError(f"source_case_unknown:{source_path.name}:{source_case_id}")
    if not isinstance(source.get("folders"), dict):
        raise ValueError(f"source_folders_invalid:{source_path.name}")
    if not isinstance(source.get("golden"), dict):
        raise ValueError(f"source_golden_invalid:{source_path.name}")
    return source


def generate_source_files(
    case_root: Path,
    source: dict[str, Any],
    created_files: list[Path],
    updated_files: list[Path],
    existing_files: list[Path],
) -> None:
    def record(path: Path, result: WriteResult) -> None:
        destination = {
            "created": created_files,
            "updated": updated_files,
            "preserved": existing_files,
        }[result]
        destination.append(path)

    folders = source["folders"]
    for folder_name in SOURCE_FOLDER_NAMES:
        entries = folders.get(folder_name)
        if not isinstance(entries, list):
            raise ValueError(f"source_folder_invalid:{source['case_id']}:{folder_name}")
        for entry in entries:
            if not isinstance(entry, dict):
                raise ValueError(f"source_entry_invalid:{source['case_id']}:{folder_name}")
            filename = entry.get("filename")
            content = entry.get("content")
            if (
                not isinstance(filename, str)
                or not filename
                or Path(filename).name != filename
                or not isinstance(content, str)
                or not content.strip()
            ):
                raise ValueError(f"source_entry_invalid:{source['case_id']}:{folder_name}")
            target = case_root / folder_name / filename
            record(target, write_text_if_empty(target, content + "\n"))

    golden = source["golden"]
    answers_root = case_root / "05_Golden标准答案"
    for key, filename in GOLDEN_FILENAMES.items():
        payload = golden.get(key)
        if not isinstance(payload, dict) or not payload:
            raise ValueError(f"source_golden_invalid:{source['case_id']}:{key}")
        target = answers_root / filename
        record(target, write_json_if_empty(target, payload))


def evaluation_template(case_id: str) -> dict[str, Any]:
    return {
        "case_id": case_id,
        "status": "not_evaluated",
        "score": None,
        "passed": None,
        "evaluated_at": None,
        "dimensions": {},
        "errors": [],
        "lawyer_feedback": "",
    }


def generate() -> tuple[list[Path], list[Path], list[Path]]:
    created_files: list[Path] = []
    updated_files: list[Path] = []
    existing_files: list[Path] = []

    GOLDEN_ROOT.mkdir(parents=True, exist_ok=True)
    readme_path = GOLDEN_ROOT / "README.md"
    (created_files if write_text_if_missing(readme_path, README) else existing_files).append(readme_path)

    for case_name in CASES:
        case_root = GOLDEN_ROOT / case_name
        for directory_name in CASE_DIRECTORIES:
            directory = case_root / directory_name
            directory.mkdir(parents=True, exist_ok=True)
            if directory_name != "05_Golden标准答案" and directory_name != "07_测试记录":
                keep_path = directory / ".gitkeep"
                (created_files if write_text_if_missing(keep_path, "") else existing_files).append(keep_path)

    source_paths = sorted(SOURCE_ROOT.glob("*.json"))
    for source_path in source_paths:
        source = load_source(source_path)
        case_name = CASE_BY_SOURCE_ID[source["case_id"]]
        generate_source_files(
            GOLDEN_ROOT / case_name,
            source,
            created_files,
            updated_files,
            existing_files,
        )

    for case_name in CASES:
        case_root = GOLDEN_ROOT / case_name
        answers_root = case_root / "05_Golden标准答案"
        for filename, template in ANSWER_TEMPLATES.items():
            payload = {**template, "case_id": case_name}
            answer_path = answers_root / filename
            (created_files if write_json_if_missing(answer_path, payload) else existing_files).append(answer_path)

        evaluation_path = case_root / "07_测试记录" / "evaluation_result.json"
        payload = evaluation_template(case_name)
        (created_files if write_json_if_missing(evaluation_path, payload) else existing_files).append(evaluation_path)

    return created_files, updated_files, existing_files


def main() -> None:
    created_files, updated_files, existing_files = generate()
    print(f"Golden Dataset root: {GOLDEN_ROOT}")
    print(f"Created files: {len(created_files)}")
    print(f"Updated empty files: {len(updated_files)}")
    print(f"Preserved files: {len(existing_files)}")
    for path in created_files:
        print(f"CREATE {path.relative_to(REPOSITORY_ROOT)}")
    for path in updated_files:
        print(f"UPDATE {path.relative_to(REPOSITORY_ROOT)}")


if __name__ == "__main__":
    main()
