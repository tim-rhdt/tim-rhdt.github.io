(async () => {
  const out = [];
  const secs = document.querySelectorAll(".reveal .slides > section");
  for (let n = 0; n < secs.length; n++) {
    Reveal.slide(n, 0, 999);
    await new Promise((r) => setTimeout(r, 150));
    const st = secs[n].querySelector(".stage"); if (!st) continue;
    const k = 1920 / st.getBoundingClientRect().width, sl = st.getBoundingClientRect().left;
    st.querySelectorAll(".ln").forEach((el) => {
      if (el.querySelector(".m")) return;
      const rg = document.createRange(); rg.selectNodeContents(el);
      const rs = [...rg.getClientRects()]; if (!rs.length) return;
      const l = Math.min(...rs.map((r) => r.left)), r = Math.max(...rs.map((r) => r.right));
      out.push({ s: n + 1, cls: [...el.classList].filter((c) => c !== "ln").join(" "), x: parseFloat(el.style.left), w: (r - l) * k, t: el.textContent });
    });
  }
  return JSON.stringify(out);
})()
