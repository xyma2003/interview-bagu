"""Load the published Python answer, never a second implementation in tests."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def load_question(relative_path: str, number: int) -> dict:
    path = ROOT / relative_path
    markdown = path.read_text(encoding="utf-8")
    headings = list(re.finditer(r"^### Q(\d+):[^\n]*$", markdown, re.MULTILINE))
    matches = [(i, heading) for i, heading in enumerate(headings)
               if int(heading.group(1)) == number]
    if len(matches) != 1:
        raise ValueError(f"{relative_path}: expected one Q{number}, got {len(matches)}")
    index, heading = matches[0]
    end = headings[index + 1].start() if index + 1 < len(headings) else len(markdown)
    section = markdown[heading.end():end]
    blocks = list(re.finditer(r"^```python[ \t]*\n(.*?)^```[ \t]*$",
                              section, re.MULTILINE | re.DOTALL))
    if len(blocks) != 1:
        raise ValueError(f"{relative_path} Q{number}: expected one Python block, "
                         f"got {len(blocks)}; select new variants explicitly")
    block = blocks[0]
    line = markdown[:heading.end() + block.start(1)].count("\n")
    namespace = {"__name__": f"documented_q{number}"}
    # Preserve Markdown line numbers in errors; no imports or answer code injected.
    code = compile("\n" * line + block.group(1), str(path), "exec")
    exec(code, namespace)
    return namespace
