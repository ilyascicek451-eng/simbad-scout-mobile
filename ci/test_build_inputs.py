import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('inputs', Path(__file__).with_name('verify-build-inputs.py'))
inputs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inputs)


class InputTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'ci').mkdir()
        self.source = self.root / 'App.tsx'
        self.source.write_bytes(b'public code\n')
        b = self.source.read_bytes()
        sha = hashlib.sha1(b'blob ' + str(len(b)).encode() + b'\0' + b).hexdigest()
        self.manifest = self.root / 'ci/build-inputs.json'
        self.manifest.write_text(json.dumps({'schema_version': 1, 'files': {'App.tsx': sha}}))

    def test_reviewed_snapshot_and_no_file_mutation(self):
        before = self.source.read_bytes()
        self.assertEqual(inputs.verify(self.root)['source_files'], 1)
        self.assertEqual(before, self.source.read_bytes())

    def test_changed_source_is_refused(self):
        self.source.write_text('changed')
        with self.assertRaises(ValueError):
            inputs.verify(self.root)

    def test_unexpected_tracked_file_is_refused(self):
        paths = {'App.tsx'} | inputs.BUILD_FILES
        self.assertEqual(inputs.verify(self.root, paths)['source_files'], 1)
        for extra in ('.env', 'upload.keystore', 'backend/private.py'):
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                inputs.verify(self.root, paths | {extra})

    def test_path_escape_is_refused(self):
        self.manifest.write_text(json.dumps({'schema_version': 1, 'files': {'../outside': 'a' * 40}}))
        with self.assertRaises(ValueError):
            inputs.verify(self.root)

    def test_symlink_is_refused(self):
        self.source.rename(self.root / 'other')
        self.source.symlink_to(self.root / 'other')
        with self.assertRaises(ValueError):
            inputs.verify(self.root)


if __name__ == '__main__':
    unittest.main()
