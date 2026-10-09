"""Actual layered eye-handoff PSD smoke tests for V1.7."""
from pathlib import Path
import json
import sys
import tempfile
import unittest
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
from build_cubism_eye_psd import make, assemble, EYES, make_closed_studies


class CubismEyeSeparationTests(unittest.TestCase):
    def test_parts_reconstruct_approved_art_without_visible_artifacts(self):
        with Image.open(ROOT/'assets/source/yuzuki-front-a.png') as img:
            orig = img.convert('RGBA')
        base, parts, merged, masks = assemble(orig)
        self.assertEqual(merged.tobytes(),orig.tobytes())
        self.assertNotEqual(base.tobytes(),orig.tobytes())
        for side in EYES:
            self.assertIsNotNone(parts[side].getbbox())
            self.assertGreater(int(masks[side]['removed'].sum()),30000)

    def test_psd_contains_visible_eye_layers_and_hidden_reference(self):
        with tempfile.TemporaryDirectory() as td:
            result=make(output_dir=Path(td))
            psd=Path(result['psd'])
            with Image.open(psd) as doc, Image.open(ROOT/'assets/source/yuzuki-front-a.png') as img:
                self.assertEqual(doc.format,'PSD')
                self.assertEqual(len(doc.layers),6)
                self.assertEqual(doc.size,(1024,1536))
                self.assertIsNone(ImageChops.difference(doc.convert('RGBA'),img.convert('RGBA')).getbbox())
            manifest=json.loads((Path(td)/'eye-separation-v1.7.json').read_text())
            self.assertFalse(manifest['production_ready'])
            self.assertEqual(manifest['working_layers'],3)
            self.assertEqual(manifest['closed_study_layers_hidden'],2)
            self.assertEqual(manifest['qa']['pixels_different_over_2'],0)
            for side in EYES:
                self.assertTrue((Path(td)/manifest['parts'][side]['png']).is_file())
                self.assertTrue((Path(td)/f'{side}-closed-draft-v1.7.png').is_file())

    def test_closed_studies_remain_optional_and_do_not_change_open_state(self):
        with Image.open(ROOT/'assets/source/yuzuki-front-a.png') as img:
            orig=img.convert('RGBA')
        base, parts, merged, masks=assemble(orig)
        hidden=make_closed_studies(orig,masks)
        sample=base.copy()
        for side in ('eye_left','eye_right'):
            sample=Image.alpha_composite(sample,hidden[side])
        self.assertNotEqual(sample.tobytes(),orig.tobytes())
        self.assertIsNone(ImageChops.difference(merged,orig).getbbox())

if __name__=='__main__':unittest.main()
