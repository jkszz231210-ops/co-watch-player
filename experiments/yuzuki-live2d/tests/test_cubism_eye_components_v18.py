"""Checks for truthful eye component extraction and art preservation, not Cubism rigging."""
from pathlib import Path
import json
import sys
import unittest
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from build_cubism_eye_parts_v18 import rebuild,make,channel_masks,IRISES,SIDES,SRC

class EyeComponentsV18Tests(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    with Image.open(SRC) as f:cls.approved=f.convert('RGBA')
    cls.original,cls.face,cls.parts,cls.masks,cls.rest,cls.stats,cls.iris_masks,cls.lash_masks=rebuild(cls.approved)

  def test_original_rest_has_no_visible_eye_regression(self):
    self.assertEqual(self.stats['pixels_changed_gt_2'],0)
    self.assertLessEqual(self.stats['max_channel_difference'],1)
    self.assertLess(self.stats['rgb_mae'],.002)

  def test_irises_have_two_distinct_tight_mattes(self):
    for side in SIDES:
      mask=self.iris_masks[side]
      self.assertGreater(np.count_nonzero(mask>127),1200)
      self.assertLess(np.count_nonzero(mask>127),4100)
      self.assertEqual(self.parts[side]['iris'].size,(1024,1536))
    self.assertNotEqual(IRISES['eye_left'][:2],IRISES['eye_right'][:2])

  def test_eyeliner_is_a_separate_top_sprite(self):
    for side in SIDES:
      ink=self.parts[side]['upper_ink']
      iris=self.parts[side]['iris']
      self.assertGreater(np.count_nonzero(self.lash_masks[side]>127),300)
      self.assertNotEqual(ink.getbbox(),iris.getbbox())
      self.assertNotEqual(ink.tobytes(),iris.tobytes())

  def test_underpaint_is_experimental_and_not_an_invisible_duplicate_iris(self):
    for side in SIDES:
      x,y,*_=IRISES[side]
      image=self.parts[side]['eye_scene'].convert('RGB')
      px=image.getpixel((x,y))
      self.assertGreater(sum(px)/3,170)
      self.assertNotEqual(px,self.approved.convert('RGB').getpixel((x,y)))

  def test_10_layer_psd_reads_and_matches_source(self):
    folder=ROOT/'assets/cubism-handoff'
    psd=folder/'yuzuki-eye-components-v1.8.psd'
    self.assertTrue(psd.is_file())
    with Image.open(psd) as doc:
      self.assertEqual(doc.format,'PSD')
      self.assertEqual(doc.size,(1024,1536))
      self.assertEqual(len(doc.layers),10)
      names=[layer[0] for layer in doc.layers]
      for title in ['L IRIS','R IRIS','L UPPER','R UPPER','FACE','REFERENCE']:
        self.assertTrue(any(name.startswith(title) for name in names))
      x=np.asarray(doc.convert('RGB'),dtype=np.int16)
      y=np.asarray(self.approved.convert('RGB'),dtype=np.int16)
      self.assertLessEqual(int(np.abs(x-y).max()),1)
    manifest=json.loads((folder/'eye-components-v1.8.json').read_text(encoding='utf-8'))
    self.assertFalse(manifest['production_ready'])
    self.assertFalse(manifest['cubism_model'])
    self.assertFalse(manifest['cubism_import_tested'])
    self.assertEqual(manifest['visible_layers'],7)
    self.assertEqual(manifest['hidden_layers'],3)
    self.assertTrue((folder/manifest['qa']).is_file())

if __name__=='__main__':unittest.main()
