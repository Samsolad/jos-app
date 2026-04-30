/**
 * Generates social media card images on a canvas
 * Matching Sam's established format from his social posts
 */

export function generateQuoteCard(options) {
    const {
      text,
      name = 'Sam Oladeinde',
      handle = '@sam_oladeinde',
      profilePhoto = null,
      style = 'dark', // 'dark' | 'light' | 'warm'
    } = options
  
    const size = 1080
    const canvas = document.createElement('canvas')
    canvas.width  = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
  
    // ── BACKGROUND ────────────────────────────────────────────────
    if (style === 'dark') {
      ctx.fillStyle = '#080808'
      ctx.fillRect(0, 0, size, size)
      // Subtle grid
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 1
      for (let x = 0; x < size; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke()
      }
      for (let y = 0; y < size; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
      }
    } else if (style === 'light') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
    } else if (style === 'warm') {
      // Warm gradient like image 1
      const grad = ctx.createLinearGradient(0, 0, size, size)
      grad.addColorStop(0, '#e8c97a')
      grad.addColorStop(1, '#c4873a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, size, size)
      // White card overlay
      const cardX = 60, cardY = 80, cardW = size - 120, cardH = size - 160
      const r = 40
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      roundRect(ctx, cardX, cardY, cardW, cardH, r)
      ctx.fill()
    }
  
    // ── TOP BAR (dark mode) ────────────────────────────────────────
    if (style === 'dark') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, 3)
    }
  
    // ── LAYOUT OFFSETS ─────────────────────────────────────────────
    const isCard = style === 'warm'
    const offsetX = isCard ? 120 : 80
    const offsetY = isCard ? 160 : 80
  
    // ── PROFILE SECTION ────────────────────────────────────────────
    const avatarSize = 80
    const avatarX    = offsetX
    const avatarY    = offsetY
  
    if (profilePhoto) {
      const img = new Image()
      img.src = profilePhoto
      // Draw circular clip
      ctx.save()
      ctx.beginPath()
      ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI*2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize)
      ctx.restore()
    } else {
      // Fallback circle
      ctx.fillStyle = style === 'dark' ? '#1f1f1f' : '#e8e8e8'
      ctx.beginPath()
      ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI*2)
      ctx.fill()
      ctx.fillStyle = style === 'dark' ? '#ffffff' : '#080808'
      ctx.font = 'bold 32px Outfit, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('SO', avatarX + avatarSize/2, avatarY + avatarSize/2 + 11)
    }
  
    // Name
    const nameX = avatarX + avatarSize + 20
    ctx.textAlign = 'left'
    ctx.fillStyle = style === 'dark' ? '#ffffff' : '#080808'
    ctx.font = 'bold 32px Outfit, sans-serif'
    ctx.fillText(name, nameX, avatarY + 30)
  
    // Handle
    ctx.fillStyle = style === 'dark' ? '#888' : '#666'
    ctx.font = '300 26px Outfit, sans-serif'
    ctx.fillText(handle, nameX, avatarY + 62)
  
    // ── DIVIDER ────────────────────────────────────────────────────
    const divY = avatarY + avatarSize + 50
    ctx.strokeStyle = style === 'dark' ? '#1f1f1f' : '#e8e8e8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(offsetX, divY)
    ctx.lineTo(size - offsetX, divY)
    ctx.stroke()
  
    // ── MAIN TEXT ──────────────────────────────────────────────────
    const textX    = offsetX
    const textY    = divY + 70
    const maxWidth = size - (offsetX * 2)
  
    ctx.fillStyle  = style === 'dark' ? '#ffffff' : '#080808'
    ctx.textAlign  = 'left'
  
    // Auto-size font based on text length
    let fontSize = 72
    if (text.length > 80)  fontSize = 58
    if (text.length > 120) fontSize = 48
    if (text.length > 160) fontSize = 42
  
    ctx.font = `bold ${fontSize}px Outfit, sans-serif`
  
    // Word wrap
    const words    = text.split(' ')
    const lines    = []
    let   current  = ''
    for (const word of words) {
      const test = current ? current + ' ' + word : word
      if (ctx.measureText(test).width > maxWidth) {
        if (current) lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  
    const lineH = fontSize * 1.25
    lines.forEach((line, i) => {
      ctx.fillText(line, textX, textY + i * lineH)
    })
  
    // ── BOTTOM BRAND ───────────────────────────────────────────────
    const brandY = size - 60
    ctx.fillStyle = style === 'dark' ? '#2a2a2a' : '#e8e8e8'
    ctx.font = '400 22px Outfit, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('jednieds.org', offsetX, brandY)
  
    ctx.fillStyle = style === 'dark' ? '#444' : '#888'
    ctx.textAlign = 'right'
    ctx.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), size - offsetX, brandY)
  
    return canvas.toDataURL('image/jpeg', 0.92)
  }
  
  // Helper: rounded rectangle path
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
  
  // Generate a story/portrait card (1080x1920)
  export function generateStoryCard(options) {
    const { text, name = 'Sam Oladeinde', handle = '@sam_oladeinde', profilePhoto = null } = options
  
    const canvas = document.createElement('canvas')
    canvas.width  = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
  
    ctx.fillStyle = '#080808'
    ctx.fillRect(0, 0, 1080, 1920)
  
    // Top bar
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 1080, 3)
  
    // Profile
    if (profilePhoto) {
      const img = new Image()
      img.src = profilePhoto
      ctx.save()
      ctx.beginPath()
      ctx.arc(100, 200, 60, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, 40, 140, 120, 120)
      ctx.restore()
    }
  
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px Outfit, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(name, 180, 190)
    ctx.fillStyle = '#888'
    ctx.font = '300 36px Outfit, sans-serif'
    ctx.fillText(handle, 180, 238)
  
    // Main text — centred vertically
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 80px Outfit, sans-serif'
    ctx.textAlign = 'left'
    const maxW = 980
    const words = text.split(' ')
    const lines = []
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (ctx.measureText(test).width > maxW) { if (cur) lines.push(cur); cur = w }
      else cur = test
    }
    if (cur) lines.push(cur)
    const totalH = lines.length * 100
    const startY = (1920 - totalH) / 2
    lines.forEach((line, i) => ctx.fillText(line, 50, startY + i * 100))
  
    ctx.fillStyle = '#2a2a2a'
    ctx.font = '400 30px Outfit, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('jednieds.org', 540, 1860)
  
    return canvas.toDataURL('image/jpeg', 0.92)
  }