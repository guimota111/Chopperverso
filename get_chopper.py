import urllib.request
import re
import os

url = 'https://html.duckduckgo.com/html/?q=tony+tony+chopper+png+transparent'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    matches = re.findall(r'src=\"(//external-content.duckduckgo.com/iu/\?u=[^\"]+)\"', html)
    for i, m in enumerate(matches[:5]):
        img_url = 'https:' + m
        print(f"Downloading {img_url}")
        req_img = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
        img_data = urllib.request.urlopen(req_img).read()
        with open(f'img/chopper_{i}.png', 'wb') as f:
            f.write(img_data)
        print(f"Saved chopper_{i}.png")
except Exception as e:
    print(f"Error: {e}")
