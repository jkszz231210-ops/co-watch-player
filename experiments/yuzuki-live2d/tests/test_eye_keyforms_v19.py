"""Quality regression checks for V1.9 authored eyelid keyform studies."""
from pathlib import Path
import sys, json, unittest
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from build_eye_keyforms_v19 import SRC,APPROVED,EYES,OUT,WEB,STEPS,apply_sprites,tuned_art

class KeyformsV19Tests(unittest.TestCase):
    def test_complete_range_has_21_steps(self):
        self.assertEqual(len(STEPS),21)
        self.assertEqual(STEPS[0],0)
        self.assertEqual(STEPS[-1],1)

    def test_open_has_no_painting_overlay(self):
        for side in EYES:
            self.assertEqual(int(tuned_art(side,0)[:,:,3].max()),0)
        self.assertEqual(APPROVED.size,(1024,1536))

    def test_half_closed_layers_are_distinct_from_empty_and_each_other(self):
        for side in EYES:
            alpha=tuned_art(side,.5)[:,:,3]
            closed=tuned_art(side,1)[:,:,3]
            self.assertGreater(int(np.count_nonzero(alpha)),500)
            self.assertGreater(int(np.count_nonzero(closed)),500)
            self.assertFalse(np.array_equal(alpha,closed))

    def test_frame_geometry_matches_each_eye_without_mirroring(self):
        for side,spec in EYES.items():
            x0,y0,x1,y1=spec['box']
            self.assertEqual(tuned_art(side,.5).shape,(y1-y0,x1-x0,4))
        self.assertNotEqual(EYES['eye_left']['box'],EYES['eye_right']['box'])

    def test_exported_psd_is_real_layered_file(self):
        psd=OUT/'yuzuki-eye-keyforms-v1.9.psd'
        self.assertTrue(psd.is_file())
        with Image.open(psd) as document:
            self.assertEqual(document.format,'PSD')
            self.assertEqual(len(document.layers),6)
            self.assertEqual(document.size,(1024,1536))
            self.assertTrue(np.array_equal(np.asarray(document.convert('RGB')),
                                           np.asarray(APPROVED.convert('RGB'))))

    def test_exported_atlas_is_web_safe(self):
        atlas=WEB/'blink-atlas.webp'
        manifest=json.loads((OUT/'manifest-v1.9.json').read_text('utf8'))
        self.assertFalse(manifest['actual_cubism_model'])
        self.assertFalse(manifest['cubism_import_verified'])
        self.assertTrue(manifest['pixel_identical_open'])
        with Image.open(atlas) as img:
            self.assertEqual(img.size,(4032,320))
            self.assertEqual(img.mode,'RGBA')
        self.assertTrue((OUT/'yuzuki-three-keyforms-v1.9.jpg').is_file())

if __name__=='__main__': unittest.main()
