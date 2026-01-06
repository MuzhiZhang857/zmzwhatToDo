import os

# 定义需要跳过的文件夹和文件后缀
EXCLUDE_DIRS = {'.git', '__pycache__', 'node_modules', 'venv', '.venv', 'dist', 'build', '.idea', '.vscode'}
INCLUDE_EXTS = {'.py', '.java', '.c', '.cpp', '.h', '.js', '.vue', '.html', '.css', '.sql', '.go'}

def merge_project(root_dir, output_file):
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Project Structure\n\n```text\n")
        # 写入目录树
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            level = root.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * level
            f.write(f"{indent}{os.path.basename(root)}/\n")
            sub_indent = ' ' * 4 * (level + 1)
            for file in files:
                if any(file.endswith(ext) for ext in INCLUDE_EXTS):
                    f.write(f"{sub_indent}{file}\n")
        f.write("```\n\n# Source Code\n\n")

        # 写入具体代码内容
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                if any(file.endswith(ext) for ext in INCLUDE_EXTS):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, root_dir)
                    f.write(f"## File: {relative_path}\n")
                    f.write(f"```{file.split('.')[-1]}\n")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as code_f:
                            f.write(code_f.read())
                    except Exception as e:
                        f.write(f"Error reading file: {e}")
                    f.write("\n```\n\n")

if __name__ == "__main__":
    merge_project('.', 'all_my_code.md')
    print("合并完成！生成文件：all_my_code.md")