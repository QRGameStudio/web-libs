import os
from pathlib import Path
import shutil

DIR_ROOT = Path(__file__).parent.resolve()
DIST_DIR = DIR_ROOT / "dist"
SCRIPT_FILE = Path(__file__)

def generate_html_index(directory):
    relative_path = directory.relative_to(DIR_ROOT)
    index_content = [
        "<html>",
        "<head><title>Index of {}</title></head>".format(relative_path),
        "<body>",
        "<h1>Index of {}</h1>".format(relative_path),
        "<ul>",
    ]

    # Add link to parent directory if not the root directory
    if directory != DIR_ROOT:
        parent_relative_path = relative_path.parent if relative_path != Path('.') else Path('..')
        index_content.append('<li><a href="{}/index.html">..</a></li>'.format(parent_relative_path))

    # List all files and directories
    for item in sorted(directory.iterdir()):
        if item.name.startswith('.') or item.name == SCRIPT_FILE:
            continue

        if item.is_dir():
            index_content.append('<li><a href="{}/index.html">{}/</a></li>'.format(item.name, item.name))
        else:
            index_content.append('<li><a href="{}">{}</a></li>'.format(item.name, item.name))

    index_content.append("</ul>")
    index_content.append("</body>")
    index_content.append("</html>")

    return "\n".join(index_content)

def save_html_index(directory, content):
    relative_path = directory.relative_to(DIR_ROOT)
    dist_path = DIST_DIR / relative_path

    dist_path.mkdir(parents=True, exist_ok=True)
    index_file = dist_path / "index.html"

    with open(index_file, 'w') as f:
        f.write(content)

def generate_indexes(directory):
    index_content = generate_html_index(directory)
    save_html_index(directory, index_content)

    for item in directory.iterdir():
        if item.is_dir() and not item.name.startswith('.') and item != SCRIPT_FILE and item != DIST_DIR:
            generate_indexes(item)

def main():
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)

    generate_indexes(DIR_ROOT)

if __name__ == "__main__":
    main()
