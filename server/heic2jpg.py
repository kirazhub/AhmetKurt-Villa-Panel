#!/usr/bin/env python3
# HEIC/HEIF -> JPG dönüştürücü (pillow-heif; güncel libheif taşır, iPhone HEIC'leri açar)
# Kullanım: python3 heic2jpg.py <girdi> <cikti.jpg>
import sys
import pillow_heif
from PIL import Image

pillow_heif.register_heif_opener()

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
im.convert("RGB").save(dst, "JPEG", quality=90)
print("OK")
