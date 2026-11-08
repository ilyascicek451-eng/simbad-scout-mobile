"""Verify the reviewed public mobile snapshot without reading secrets or private repositories."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess

BUILD_FILES = {'README.md', '.gitignore', '.github/workflows/android-build.yml',
               'ci/build-inputs.json', 'ci/verify-build-inputs.py', 'ci/test_build_inputs.py'}


def verify(root, tracked=None):
    root = Path(root).resolve()
    manifest = root / 'ci/build-inputs.json'
    data = json.loads(manifest.read_text())
    if data.get('schema_version') != 1 or not isinstance(data.get('files'), dict) or not data['files']:
        raise ValueError('Invalid public source manifest')
    expected = data['files']
    for name, wanted in expected.items():
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or str(path) != name or '\\' in name:
            raise ValueError('Invalid public input path')
        if not isinstance(wanted, str) or not re.fullmatch('[0-9a-f]{40}', wanted):
            raise ValueError('Invalid public input digest')
        local = root / name
        if not local.is_file() or any(p.is_symlink() for p in [local, *local.parents] if p != root):
            raise ValueError('Missing or symbolic public input')
        content = local.read_bytes()
        actual = hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()
        if actual != wanted:
            raise ValueError('Public input differs from reviewed snapshot')
    if tracked is not None:
        if set(tracked) != set(expected) | BUILD_FILES:
            raise ValueError('Tracked files differ from the public allow-list')
        for name in tracked:
            if re.search(r'(^|/)(\.env($|\.)|[^/]+\.(keystore|jks|pem|key|db|sqlite|zip|apk|aab)$)', name, re.I) and name != '.env.example':
                raise ValueError('Sensitive file type is not allowed in the public repository')
    return {'schema_version': 1, 'source_files': len(expected),
            'public_inputs_sha256': hashlib.sha256(manifest.read_bytes()).hexdigest()}


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    # On CI use Git's tracked set, not an arbitrary recursive scan through dependencies.
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
    tracked = [p for p in tracked if p]
    try:
        print(json.dumps(verify(root, tracked), sort_keys=True))
    except (ValueError, OSError, json.JSONDecodeError):
        raise SystemExit('Public source verification failed; no signing key has been loaded')
