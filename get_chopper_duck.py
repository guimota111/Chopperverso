import urllib.request, re

url = "https://html.duckduckgo.com/html/?q=tony+tony+chopper+png+transparent"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
html = urllib.request.urlopen(req).read().decode("utf-8")
matches = re.findall(r"src=\"(//external-content.duckduckgo.com/iu/\?u=[^\"]+)\"", html)

for i, m in enumerate(matches[:5]):
    img_url = "https:" + m
    img_url = img_url.replace("&amp;", "&")
    print("Downloading", img_url)
    try:
        req_img = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        data = urllib.request.urlopen(req_img).read()
        with open(f"img/chopper_real_{i}.png", "wb") as f:
            f.write(data)
        print(f"Saved chopper_real_{i}.png")
    except Exception as e:
        print(f"Error: {e}")
