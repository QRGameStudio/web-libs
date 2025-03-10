import os
from pathlib import Path
import shutil

DIR_ROOT = Path(__file__).parent.resolve()
DIR_DIST = DIR_ROOT / "dist"
DIR_COMPIER = DIR_ROOT / "compile"
SCRIPT_FILE = Path(__file__).name

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
        if item.name.startswith('.') or item.name == SCRIPT_FILE or item in (DIR_DIST, DIR_COMPIER):
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
    dist_path = DIR_DIST / relative_path

    dist_path.mkdir(parents=True, exist_ok=True)
    index_file = dist_path / "index.html"

    with open(index_file, 'w') as f:
        f.write(content)

def copy_files(directory):
    for item in directory.iterdir():
        if item.name.startswith('.') or item.name == SCRIPT_FILE or item in (DIR_DIST, DIR_COMPIER):
            continue

        relative_path = item.relative_to(DIR_ROOT)
        dist_path = DIR_DIST / relative_path

        if item.is_dir():
            dist_path.mkdir(parents=True, exist_ok=True)
            copy_files(item)
        else:
            shutil.copy2(item, dist_path)

def generate_indexes(directory):
    index_content = generate_html_index(directory)
    save_html_index(directory, index_content)

    for item in directory.iterdir():
        if item.is_dir() and not item.name.startswith('.') and item.name != SCRIPT_FILE and item != DIR_DIST:
            generate_indexes(item)

def main():
    if DIR_DIST.exists():
        shutil.rmtree(DIR_DIST)

    # Copy all files and directories to the dist directory
    copy_files(DIR_ROOT)

    # Generate HTML indexes
    generate_indexes(DIR_ROOT)

if __name__ == "__main__":
    main()
