"""Tests for actual exported V2.0 eye drawing assets and layered handoff."""
import hashlib, json,sys,unittest
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from build_eye_keyforms_v20 import OUT,WEB,STEPS,SIDES,APPROVED,authored_ink
class KeyformV20Tests(unittest.TestCase):
    def test_41_frames_and_no_open_overlay(self):
        self.assertEqual(len(STEPS),41)
        for side in SIDES:self.assertEqual(int(authored_ink(side,0)[:,:,3].max()),0)
    def test_png_matches_approved_art_when_open(self):
        a=np.asarray(APPROVED.convert('RGB'))
        b=np.asarray(Image.open(OUT/'key-open.png').convert('RGB'))
        self.assertTrue(np.array_equal(a,b))
    def test_psd_has_actual_editable_keyform_layers(self):
        with Image.open(OUT/'yuzuki-single-ink-keyforms-v2.0.psd') as psd:
            self.assertEqual(psd.format,'PSD');self.assertEqual(len(psd.layers),8)
            self.assertEqual(psd.size,(1024,1536))
            self.assertTrue(np.array_equal(np.asarray(psd.convert('RGB')),np.asarray(APPROVED.convert('RGB'))))
    def test_atlas_size_matches_41_cells(self):
        with Image.open(WEB/'blink-atlas.webp') as atlas:
            self.assertEqual(atlas.size,(7872,320))
        data=json.loads((OUT/'manifest-v2.0.json').read_text('utf8'))
        self.assertTrue(data['single_lash_stroke']);self.assertFalse(data['actual_cubism_model']);self.assertFalse(data['import_verified'])
        self.assertEqual(data['original_sha256'],hashlib.sha256((ROOT/'assets/source/yuzuki-front-a.png').read_bytes()).hexdigest())
    def test_review_page_exists_with_embedded_assets(self):
        doc=(ROOT/'柚希-V2.0-眨眼成品审核.html').read_text('utf8')
        self.assertIn('data:image/webp;base64',doc);self.assertIn('闭合',doc)
if __name__=='__main__':unittest.main()
