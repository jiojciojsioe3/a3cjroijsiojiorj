﻿class View{
	constructor(controller){
		this.controller = controller
		
		this.canvas = document.getElementById("canvas")
		this.ctx = this.canvas.getContext("2d")
		
		this.pauseMenu = document.getElementById("pause-menu")
		this.cursor = document.getElementById("cursor")
		this.gameDiv = document.getElementById("game")
		
		this.portraitClass = false
		this.touchp2Class = false
		
		this.currentScore = {
			ms: -Infinity,
			type: 0
		}
		this.noteFace = {
			small: 0,
			big: 3
		}
		this.nextBeat = 0
		this.gogoTime = 0
		this.drumroll = []
		
		this.beatInterval = this.controller.parsedSongData.beatInfo.beatInterval
		this.font = "TnT, Meiryo, sans-serif"
		
		this.draw = new CanvasDraw()
		this.assets = new ViewAssets(this)
		
		this.titleCache = new CanvasCache()
		this.comboCache = new CanvasCache()
		
		this.multiplayer = this.controller.multiplayer
		
		this.touchEnabled = this.controller.touchEnabled
		this.touch = -Infinity
		
		if(this.multiplayer !== 2){
			pageEvents.add(window, "resize", () => {
				if(this.controller.game.isPaused()){
					this.refresh()
					setTimeout(this.refresh.bind(this), 100)
				}
			})
			
			if(this.controller.touchEnabled){
				this.touchDrumDiv = document.getElementById("touch-drum")
				this.touchDrumImg = document.getElementById("touch-drum-img")
				
				if(this.controller.autoPlayEnabled){
					this.touchDrumDiv.style.display = "none"
				}else{
					pageEvents.add(this.canvas, "touchstart", this.ontouch.bind(this))
				}
				
				this.gameDiv.classList.add("touch-visible")
				document.getElementById("version").classList.add("version-hide")
				
				this.touchFullBtn = document.getElementById("touch-full-btn")
				pageEvents.add(this.touchFullBtn, "touchend", toggleFullscreen)
				if(!fullScreenSupported){
					this.touchFullBtn.style.display = "none"
				}
				
				this.touchPauseBtn = document.getElementById("touch-pause-btn")
				pageEvents.add(this.touchPauseBtn, "touchend", () => {
					this.controller.togglePauseMenu()
				})
				if(this.multiplayer){
					this.touchPauseBtn.style.display = "none"
				}
			}
		}
	}
	run(){
		this.setBackground()
		
		this.lastMousemove = this.controller.getElapsedTime()
		pageEvents.mouseAdd(this, this.onmousemove.bind(this))
		
		this.refresh()
	}
	refresh(){
		var ctx = this.ctx
		
		var winW = innerWidth
		var winH = lastHeight
		
		if(winW / 32 > winH / 9){
			winW = winH / 9 * 32
		}
		
		this.portrait = winW < winH
		var touchMultiplayer = this.touchEnabled && this.multiplayer && !this.portrait
		
		this.pixelRatio = window.devicePixelRatio || 1
		winW *= this.pixelRatio
		winH *= this.pixelRatio
		if(this.portrait){
			var ratioX = winW / 720
			var ratioY = winH / 1280
		}else{
			var ratioX = winW / 1280
			var ratioY = winH / 720
		}
		var ratio = (ratioX < ratioY ? ratioX : ratioY)
		
		if(this.winW !== winW || this.winH !== winH){
			this.winW = winW
			this.winH = winH
			this.ratio = ratio
			
			if(this.multiplayer !== 2){
				this.canvas.width = winW
				this.canvas.height = winH
				ctx.scale(ratio, ratio)
				this.canvas.style.width = (winW / this.pixelRatio) + "px"
				this.canvas.style.height = (winH / this.pixelRatio) + "px"
				
				this.titleCache.resize(640, 80, ratio)
			}
			this.fillComboCache()
		}else if(this.multiplayer !== 2){
			ctx.clearRect(0, 0, winW / ratio, winH / ratio)
		}
		winW /= ratio
		winH /= ratio
		var ms = this.getMS()
		
		if(this.portrait){
			var frameTop = winH / 2 - 1280 / 2
			var frameLeft = winW / 2 - 720 / 2
		}else{
			var frameTop = winH / 2 - 720 / 2
			var frameLeft = winW / 2 - 1280 / 2
		}
		if(this.multiplayer === 2){
			frameTop += this.multiplayer === 2 ? 165 : 176
		}
		if(touchMultiplayer){
			if(!this.touchp2Class){
				this.touchp2Class = true
				this.gameDiv.classList.add("touchp2")
			}
			frameTop -= 90
		}else if(this.touchp2Class){
			this.touchp2Class = false
			this.gameDiv.classList.remove("touchp2")
		}
		
		ctx.save()
		ctx.translate(0, frameTop)
		
		this.drawGogoTime()
		
		if(!touchMultiplayer){
			this.assets.drawAssets("background")
		}
		
		if(this.multiplayer !== 2){
			this.titleCache.get({
				ctx: ctx,
				x: winW - (touchMultiplayer && fullScreenSupported ? 750 : 650),
				y: touchMultiplayer ? 75 : 10,
				w: 640,
				h: 80,
				id: "title"
			}, ctx => {
				this.draw.layeredText({
					ctx: ctx,
					text: this.controller.selectedSong.title,
					fontSize: 40,
					fontFamily: this.font,
					x: 620,
					y: 20,
					width: 600,
					align: "right"
				}, [
					{outline: "#000", letterBorder: 10},
					{fill: "#fff"}
				])
			})
		}
		
		var score = this.controller.getGlobalScore()
		var gaugePercent = Math.round(score.gauge / 2) / 50
		
		if(this.multiplayer === 2){
			var scoreImg = "bg_score_p2"
			var scoreFill = "#6bbec0"
		}else{
			var scoreImg = "bg_score_p1"
			var scoreFill = "#fa4529"
		}
		
		if(this.portrait){
			// Portrait
			
			if(!this.portraitClass){
				this.portraitClass = true
				this.gameDiv.classList.add("portrait")
			}
			
			this.slotPos = {
				x: 66,
				y: frameTop + 375,
				size: 100,
				paddingLeft: 0
			}
			this.scorePos = {x: 363, y: frameTop + (this.multiplayer === 2 ? 520 : 227)}
			
			var animPos = {
				x1: this.slotPos.x + 13,
				y1: this.slotPos.y + (this.multiplayer === 2 ? 27 : -27),
				x2: winW - 38,
				y2: frameTop + (this.multiplayer === 2 ? 484 : 293)
			}
			var taikoPos = {
				x: 19,
				y: frameTop + (this.multiplayer === 2 ? 464 : 184),
				w: 111,
				h: 130
			}
			
			ctx.fillStyle = "#000"
			ctx.fillRect(
				0,
				this.multiplayer === 2 ? 306 : 288,
				winW,
				this.multiplayer === 1 ? 184 : 183
			)
			ctx.beginPath()
			if(this.multiplayer === 2){
				ctx.moveTo(0, 467)
				ctx.lineTo(384, 467)
				ctx.lineTo(384, 512)
				ctx.lineTo(184, 560)
				ctx.lineTo(0, 560)
			}else{
				ctx.moveTo(0, 217)
				ctx.lineTo(184, 217)
				ctx.lineTo(384, 265)
				ctx.lineTo(384, 309)
				ctx.lineTo(0, 309)
			}
			ctx.fill()
			
			// Left side
			ctx.fillStyle = scoreFill
			var leftSide = (ctx, mul) => {
				ctx.beginPath()
				if(this.multiplayer === 2){
					ctx.moveTo(0, 468 * mul)
					ctx.lineTo(380 * mul, 468 * mul)
					ctx.lineTo(380 * mul, 512 * mul)
					ctx.lineTo(184 * mul, 556 * mul)
					ctx.lineTo(0, 556 * mul)
				}else{
					ctx.moveTo(0, 221 * mul)
					ctx.lineTo(184 * mul, 221 * mul)
					ctx.lineTo(380 * mul, 265 * mul)
					ctx.lineTo(380 * mul, 309 * mul)
					ctx.lineTo(0, 309 * mul)
				}
			}
			leftSide(ctx, 1)
			ctx.fill()
			ctx.globalAlpha = 0.5
			this.draw.pattern({
				ctx: ctx,
				img: assets.image[scoreImg],
				shape: leftSide,
				dx: 0,
				dy: 45,
				scale: 1.55
			})
			ctx.globalAlpha = 1
			
			// Score background
			ctx.fillStyle = "#000"
			ctx.beginPath()
			if(this.multiplayer === 2){
				this.draw.roundedCorner(ctx, 184, 512, 20, 0)
				ctx.lineTo(384, 512)
				this.draw.roundedCorner(ctx, 384, 560, 12, 2)
				ctx.lineTo(184, 560)
			}else{
				ctx.moveTo(184, 217)
				this.draw.roundedCorner(ctx, 384, 217, 12, 1)
				ctx.lineTo(384, 265)
				this.draw.roundedCorner(ctx, 184, 265, 20, 3)
			}
			ctx.fill()
			
			// Difficulty
			var badgeImg = assets.image["muzu_" + this.controller.selectedSong.difficulty]
			var badgeW = badgeImg.width / badgeImg.height * 53
			ctx.drawImage(badgeImg,
				157 - badgeW / 2,
				this.multiplayer === 2 ? 497 : 228,
				badgeW,
				53
			)
			
			// Badges
			if(this.controller.autoPlayEnabled && !this.controller.multiplayer){
				this.ctx.drawImage(assets.image["badge_auto"],
					183,
					this.multiplayer === 2 ? 490 : 265,
					23,
					23
				)
			}
			
			// Gauge
			ctx.fillStyle = "#000"
			ctx.beginPath()
			var gaugeX = winW - 788 * 0.7 - 32
			if(this.multiplayer === 2){
				ctx.moveTo(gaugeX, 464)
				ctx.lineTo(winW, 464)
				ctx.lineTo(winW, 489)
				this.draw.roundedCorner(ctx, gaugeX, 489, 12, 3)
			}else{
				this.draw.roundedCorner(ctx, gaugeX, 288, 12, 0)
				ctx.lineTo(winW, 288)
				ctx.lineTo(winW, 314)
				ctx.lineTo(gaugeX, 314)
			}
			ctx.fill()
			this.draw.gauge({
				ctx: ctx,
				x: winW,
				y: this.multiplayer === 2 ? 468 : 273,
				clear: 25 / 50,
				percentage: gaugePercent,
				font: this.font,
				scale: 0.7,
				multiplayer: this.multiplayer === 2,
				blue: this.multiplayer === 2
			})
			this.draw.soul({
				ctx: ctx,
				x: winW - 40,
				y: this.multiplayer === 2 ? 484 : 293,
				scale: 0.75,
				cleared: gaugePercent - 1 / 50 >= 25 / 50
			})
			
			// Note bar
			ctx.fillStyle = "#2c2a2c"
			ctx.fillRect(0, 314, winW, 122)
			ctx.fillStyle = "#847f84"
			ctx.fillRect(0, 440, winW, 24)
		
		}else{
			// Landscape
			
			if(this.portraitClass){
				this.portraitClass = false
				this.gameDiv.classList.remove("portrait")
			}
			
			this.slotPos = {
				x: 413,
				y: frameTop + 257,
				size: 106,
				paddingLeft: 332
			}
			this.scorePos = {
				x: 155,
				y: frameTop + (this.multiplayer === 2 ? 318 : 193)
			}
			
			var animPos = {
				x1: this.slotPos.x + 14,
				y1: this.slotPos.y + (this.multiplayer === 2 ? 29 : -29),
				x2: winW - 55,
				y2: frameTop + (this.multiplayer === 2 ? 378 : 165)
			}
			var taikoPos = {x: 179, y: frameTop + 190, w: 138, h: 162}
			
			ctx.fillStyle = "#000"
			ctx.fillRect(
				0,
				184,
				winW,
				this.multiplayer === 1 ? 177 : 176
			)
			ctx.beginPath()
			if(this.multiplayer === 2){
				ctx.moveTo(328, 351)
				ctx.lineTo(winW, 351)
				ctx.lineTo(winW, 385)
				this.draw.roundedCorner(ctx, 328, 385, 10, 3)
			}else{
				ctx.moveTo(328, 192)
				this.draw.roundedCorner(ctx, 328, 158, 10, 0)
				ctx.lineTo(winW, 158)
				ctx.lineTo(winW, 192)
			}
			ctx.fill()
			
			// Gauge
			this.draw.gauge({
				ctx: ctx,
				x: winW,
				y: this.multiplayer === 2 ? 357 : 135,
				clear: 25 / 50,
				percentage: gaugePercent,
				font: this.font,
				multiplayer: this.multiplayer === 2,
				blue: this.multiplayer === 2
			})
			this.draw.soul({
				ctx: ctx,
				x: winW - 57,
				y: this.multiplayer === 2 ? 378 : 165,
				cleared: gaugePercent - 1 / 50 >= 25 / 50
			})
			
			// Note bar
			ctx.fillStyle = "#2c2a2c"
			ctx.fillRect(332, 192, winW - 332, 130)
			ctx.fillStyle = "#847f84"
			ctx.fillRect(332, 326, winW - 332, 26)
			
			// Left side
			ctx.fillStyle = scoreFill
			ctx.fillRect(0, 192, 328, 160)
			ctx.globalAlpha = 0.5
			this.draw.pattern({
				ctx: ctx,
				img: assets.image[scoreImg],
				x: 0,
				y: 192,
				w: 328,
				h: 160,
				dx: 0,
				dy: 45,
				scale: 1.55
			})
			ctx.globalAlpha = 1
			
			// Difficulty
			var badgeImg = assets.image["muzu_" + this.controller.selectedSong.difficulty]
			var badgeW = badgeImg.width / badgeImg.height * 120
			ctx.drawImage(badgeImg,
				87 - badgeW / 2, this.multiplayer === 2 ? 194 : 232,
				badgeW, 120
			)
			
			// Badges
			if(this.controller.autoPlayEnabled && !this.controller.multiplayer){
				this.ctx.drawImage(assets.image["badge_auto"],
					125, 235, 34, 34
				)
			}
			
			// Score background
			ctx.fillStyle = "#000"
			ctx.beginPath()
			if(this.multiplayer === 2){
				ctx.moveTo(0, 312)
				this.draw.roundedCorner(ctx, 176, 312, 20, 1)
				ctx.lineTo(176, 353)
				ctx.lineTo(0, 353)
			}else{
				ctx.moveTo(0, 191)
				ctx.lineTo(176, 191)
				this.draw.roundedCorner(ctx, 176, 232, 20, 2)
				ctx.lineTo(0, 232)
			}
			ctx.fill()
		}
		
		ctx.restore()
		
		animPos.w = animPos.x2 - animPos.x1
		animPos.h = animPos.y1 - animPos.y2
		this.animateBezier = [{
			// 427, 228
			x: animPos.x1,
			y: animPos.y1
		}, {
			// 560, 10
			x: animPos.x1 + animPos.w / 6,
			y: animPos.y1 - animPos.h * (this.multiplayer === 2 ? 2.5 : 3.5)
		}, {
			// 940, -150
			x: animPos.x2 - animPos.w / 3,
			y: animPos.y2 - animPos.h * (this.multiplayer === 2 ? 3.5 : 5)
		}, {
			// 1225, 165
			x: animPos.x2,
			y: animPos.y2
		}]
		
		var touchTop = frameTop + (touchMultiplayer ? 135 : 0)
		this.touchDrum = (() => {
			var sw = 842
			var sh = 340
			var x = 0
			var y = this.portrait ? touchTop + 477 : touchTop + 365
			var paddingTop = 13
			var w = winW
			var maxH = winH - y
			var h = maxH - paddingTop
			if(w / h >= sw / sh){
				w = h / sh * sw
				x = (winW - w) / 2
				y += paddingTop
			}else{
				h = w / sw * sh
				y = y + (maxH - h)
			}
			return {
				x: x, y: y, w: w, h: h
			}
		})()
		this.touchCircle = {
			x: winW / 2,
			y: winH + this.touchDrum.h * 0.1,
			rx: this.touchDrum.w / 2 - this.touchDrum.h * 0.03,
			ry: this.touchDrum.h * 1.07
		}
		
		if(this.multiplayer !== 2){
			this.mouseIdle()
			this.drawTouch()
		}
		
		// Score
		ctx.save()
		ctx.font = "30px " + this.font
		ctx.fillStyle = "#fff"
		ctx.strokeStyle = "#fff"
		ctx.lineWidth = 0.3
		ctx.textAlign = "center"
		ctx.textBaseline = "top"
		var glyph = 29
		var pointsText = score.points.toString().split("")
		ctx.translate(this.scorePos.x, this.scorePos.y)
		ctx.scale(0.7, 1)
		for(var i in pointsText){
			var x = glyph * (i - pointsText.length + 1)
			ctx.strokeText(pointsText[i], x, 0)
			ctx.fillText(pointsText[i], x, 0)
		}
		ctx.restore()
		
		// Bar pressed keys
		var keyTime = this.controller.getKeyTime()
		var sound = keyTime["don"] > keyTime["ka"] ? "don" : "ka"
		var padding = this.slotPos.paddingLeft
		var mul = this.slotPos.size / 106
		var barY = this.slotPos.y - 65 * mul
		var barH = 130 * mul
		
		if(this.gogoTime || ms <= this.gogoTimeStarted + 100){
			var grd = ctx.createLinearGradient(0, 0, this.winW, 0)
			grd.addColorStop(0, "#512a2c")
			grd.addColorStop(0.46, "#6f2a2d")
			grd.addColorStop(0.76, "#8a4763")
			grd.addColorStop(1, "#2c2a2c")
			ctx.fillStyle = grd
			if(!this.touchEnabled){
				var alpha = Math.min(100, ms - this.gogoTimeStarted) / 100
				if(!this.gogoTime){
					alpha = 1 - alpha
				}
				ctx.globalAlpha = alpha
			}
			ctx.fillRect(padding, barY, winW - padding, barH)
		}
		if(keyTime[sound] > ms - 200){
			var gradients = {
				"don": ["#f54c25", "#232323"],
				"ka": ["#75cee9", "#232323"]
			}
			var grd = ctx.createLinearGradient(0, 0, this.winW, 0)
			grd.addColorStop(0, gradients[sound][0])
			grd.addColorStop(1, gradients[sound][1])
			ctx.fillStyle = grd
			ctx.globalAlpha = 1 - (ms - keyTime[sound]) / 200
			ctx.fillRect(padding, barY, winW - padding, barH)
		}
		ctx.globalAlpha = 1
		
		// Taiko
		ctx.drawImage(assets.image["taiko"],
			0, 0, 138, 162,
			taikoPos.x, taikoPos.y, taikoPos.w, taikoPos.h
		)
		
		// Taiko pressed keys
		var kbd = this.controller.getBindings()
		var keys = ["ka_l", "ka_r", "don_l", "don_r"]
		
		for(var i = 0; i < keys.length; i++){
			var keyMS = ms - keyTime[kbd[keys[i]]]
			if(keyMS < 130){
				if(keyMS > 70 && !this.touchEnabled){
					ctx.globalAlpha = this.draw.easeOut(1 - (keyMS - 70) / 60)
				}
				ctx.drawImage(assets.image["taiko"],
					0, 162 * (i + 1), 138, 162,
					taikoPos.x, taikoPos.y, taikoPos.w, taikoPos.h
				)
			}
		}
		ctx.globalAlpha = 1
		
		// Combo
		var scoreMS = ms - this.currentScore.ms
		
		var comboCount = this.controller.getCombo()
		if(comboCount >= 10){
			var comboText = comboCount.toString().split("")
			var mul = this.portrait ? 0.8 : 1
			var comboX = taikoPos.x + taikoPos.w / 2
			var comboY = taikoPos.y + taikoPos.h * 0.09
			var comboScale = 0
			if(this.currentScore !== 0 && scoreMS < 100){
				comboScale = this.draw.fade(scoreMS / 100)
			}
			var glyphW = 51
			var glyphH = 64
			var letterSpacing = (comboText.length >= 4 ? 38 : 42) * mul
			var orange = comboCount >= 100 ? "1" : "0"
			
			var w = glyphW * mul
			var h = glyphH * mul * (1 + comboScale / 8)
			
			for(var i in comboText){
				var textX = comboX + letterSpacing * (i - (comboText.length - 1) / 2)
				this.comboCache.get({
					ctx: ctx,
					x: textX - w / 2,
					y: comboY + glyphH * mul - h,
					w: w,
					h: h,
					id: orange + "combo" + comboText[i]
				})
			}
			
			var fontSize = 24 * mul
			var comboTextY = taikoPos.y + taikoPos.h * 0.63
			if(orange === "1"){
				var grd = ctx.createLinearGradient(
					0,
					comboTextY - fontSize * 0.6,
					0,
					comboTextY + fontSize * 0.1
				)
				grd.addColorStop(0, "#ff2000")
				grd.addColorStop(0.5, "#ffc321")
				grd.addColorStop(1, "#ffedb7")
				ctx.fillStyle = grd
			}else{
				ctx.fillStyle = "#fff"
			}
			ctx.font = fontSize + "px " + this.font
			ctx.lineWidth = 7 * mul
			ctx.textAlign = "center"
			ctx.strokeText("コンボ", comboX, comboTextY)
			ctx.fillText("コンボ", comboX, comboTextY)
		}
		
		// Slot
		this.draw.slot(ctx, this.slotPos.x, this.slotPos.y, this.slotPos.size)
		
		// Measures
		ctx.save()
		ctx.rect(this.slotPos.paddingLeft, 0, winW - this.slotPos.paddingLeft, winH)
		ctx.clip()
		this.drawMeasures()
		ctx.restore()
		
		// Go go time fire
		this.assets.drawAssets("bar")
		
		// Hit notes shadow
		if(scoreMS < 300 && this.currentScore.type){
			var fadeOut = scoreMS > 120 && !this.touchEnabled
			if(fadeOut){
				ctx.globalAlpha = 1 - (scoreMS - 120) / 180
			}
			var scoreId = this.currentScore.type === 230 ? 0 : 1
			if(this.currentScore.bigNote){
				scoreId += 2
			}
			ctx.drawImage(assets.image["notes_hit"],
				0, 128 * scoreId, 128, 128,
				this.slotPos.x - 64, this.slotPos.y - 64,
				128, 128
			)
			if(fadeOut){
				ctx.globalAlpha = 1
			}
		}
		
		// Future notes
		this.updateNoteFaces()
		ctx.save()
		ctx.rect(this.slotPos.paddingLeft, 0, winW - this.slotPos.paddingLeft, winH)
		ctx.clip()
		
		this.drawCircles(this.controller.getCircles())
		ctx.restore()
		
		// Hit notes explosion
		
		
		// Good, OK, Bad
		if(scoreMS < 300){
			var mul = this.slotPos.size / 106
			var scores = {
				"0": "bad",
				"230": "ok",
				"450": "good"
			}
			var yOffset = scoreMS < 70 ? scoreMS * (13 / 70) : 0
			var fadeOut = scoreMS > 250 && !this.touchEnabled
			if(fadeOut){
				ctx.globalAlpha = 1 - (scoreMS - 250) / 50
			}
			this.draw.score({
				ctx: ctx,
				score: scores[this.currentScore.type],
				x: this.slotPos.x,
				y: this.slotPos.y - 98 * mul - yOffset,
				scale: 1.35 * mul,
				align: "center"
			})
			if(fadeOut){
				ctx.globalAlpha = 1
			}
		}
		
		// Animating notes
		this.drawAnimatedCircles(this.controller.getCircles())
		this.drawAnimatedCircles(this.drumroll)
		
		// Go-go time fireworks
		if(!this.touchEnabled && !this.portrait && !this.multiplayer){
			this.assets.drawAssets("foreground")
		}
	}
	setBackground(){
		var gameDiv = document.getElementById("game")
		var selectedSong = this.controller.selectedSong
		var bg = gameConfig.songs_baseurl + selectedSong.folder + "/bg.png"
		if(selectedSong.defaultBg){
			var categories = {
				"J-POP": 0,
				"アニメ": 1,
				"ボーカロイド™曲": 2,
				"バラエティ": 3,
				"クラシック": 4,
				"ゲームミュージック": 5,
				"ナムコオリジナル": 6
			}
			var catId = 7
			if(selectedSong.category in categories){
				catId = categories[selectedSong.category]
			}
			bg = assets.image["bg_genre_" + catId].src
			gameDiv.classList.add("default-bg")
		}
		gameDiv.style.backgroundImage = "url('" + bg + "')"
	}
	
	drawMeasures(){
		var measures = this.controller.parsedSongData.measures
		var ms = this.getMS()
		var mul = this.slotPos.size / 106
		var distanceForCircle = this.winW / this.ratio - this.slotPos.x
		var measureY = this.slotPos.y - 65 * mul
		var measureH = 130 * mul
		
		measures.forEach(measure => {
			var timeForDistance = this.posToMs(distanceForCircle, measure.speed)
			if(ms >= measure.ms - timeForDistance && ms <= measure.ms + 350){
				var measureX = this.slotPos.x + this.msToPos(measure.ms - ms, measure.speed)
				this.ctx.strokeStyle = "#bdbdbd"
				this.ctx.lineWidth = 3
				this.ctx.beginPath()
				this.ctx.moveTo(measureX, measureY)
				this.ctx.lineTo(measureX, measureY + measureH)
				this.ctx.stroke()
			}
		})
	}
	updateNoteFaces(){
		var ms = this.getMS()
		while(ms >= this.nextBeat){
			this.nextBeat += this.beatInterval
			if(this.controller.getCombo() >= 50){
				var face = Math.floor(ms / this.beatInterval) % 2
				this.noteFace = {
					small: face,
					big: face + 2
				}
			}else{
				this.noteFace = {
					small: 0,
					big: 3
				}
			}
		}
	}
	drawCircles(circles){
		var distanceForCircle = this.winW / this.ratio - this.slotPos.x
		var ms = this.controller.getElapsedTime()
		
		for(var i = circles.length; i--;){
			var circle = circles[i]
			var speed = circle.getSpeed()
			
			var timeForDistance = this.posToMs(distanceForCircle + this.slotPos.size / 2, speed)
			var startingTime = circle.getMS() - timeForDistance
			var finishTime = circle.getEndTime() + this.posToMs(this.slotPos.x - this.slotPos.paddingLeft + this.slotPos.size * 2, speed)
			
			if(circle.getPlayed() <= 0 || circle.getScore() === 0){
				if(ms >= startingTime && ms <= finishTime && circle.getPlayed() !== -1){
					this.drawCircle(circle)
				}
			}else if(!circle.isAnimated()){
				// Start animation to gauge
				circle.animate(ms)
			}
			if(ms >= circle.ms && !circle.gogoChecked){
				if(this.gogoTime != circle.gogoTime){
					this.toggleGogoTime(circle)
				}
				circle.gogoChecked = true
			}
		}
	}
	drawAnimatedCircles(circles){
		var ms = this.controller.getElapsedTime()
		
		for(var i = 0; i < circles.length; i++){
			var circle = circles[i]
			
			if(circle.isAnimated()){
				
				var animT = circle.getAnimT()
				if(ms < animT + 490){
					
					var animPoint = (ms - animT) / 490
					var bezierPoint = this.calcBezierPoint(this.draw.easeOut(animPoint), this.animateBezier)
					this.drawCircle(circle, {x: bezierPoint.x, y: bezierPoint.y})
					
				}else if(ms < animT + 810){
					var pos = this.animateBezier[3]
					this.drawCircle(circle, pos, (ms - animT - 490) / 160)
				}else{
					circle.endAnimation()
				}
			}
		}
	}
	calcBezierPoint(t, data){
		var at = 1 - t
		data = data.slice()
		
		for(var i = 1; i < data.length; i++){
			for(var k = 0; k < data.length - i; k++){
				data[k] = {
					x: data[k].x * at + data[k + 1].x * t,
					y: data[k].y * at + data[k + 1].y * t
				}
			}
		}
		return data[0]
	}
	drawCircle(circle, circlePos, fade){
		var ctx = this.ctx
		var mul = this.slotPos.size / 106
		
		var bigCircleSize = 106 * mul / 2
		var circleSize = 70 * mul / 2
		var lyricsSize = 20 * mul
		
		var fill, size, faceID
		var type = circle.getType()
		var ms = this.controller.getElapsedTime()
		var circleMs = circle.getMS()
		var endTime = circle.getEndTime()
		var animated = circle.isAnimated()
		var speed = circle.getSpeed()
		var played = circle.getPlayed()
		var drumroll = 0
		var endX = 0
		
		if(!circlePos){
			circlePos = {
				x: this.slotPos.x + this.msToPos(circleMs - ms, speed),
				y: this.slotPos.y
			}
		}
		if(animated){
			var noteFace = {
				small: 0,
				big: 3
			}
		}else{
			var noteFace = this.noteFace
		}
		if(type === "don" || type === "daiDon" && played === 1){
			fill = "#f34728"
			size = circleSize
			faceID = noteFace.small
		}else if(type === "ka" || type === "daiKa" && played === 1){
			fill = "#65bdbb"
			size = circleSize
			faceID = noteFace.small
		}else if(type === "daiDon"){
			fill = "#f34728"
			size = bigCircleSize
			faceID = noteFace.big
		}else if(type === "daiKa"){
			fill = "#65bdbb"
			size = bigCircleSize
			faceID = noteFace.big
		}else if(type === "balloon"){
			if(animated){
				fill = "#f34728"
				size = bigCircleSize * 0.8
				faceID = noteFace.big
			}else{
				fill = "#f87700"
				size = circleSize
				faceID = noteFace.small
				var h = size * 1.8
				if(circleMs < ms && ms <= endTime){
					circlePos.x = this.slotPos.x
				}else if(ms > endTime){
					circlePos.x = this.slotPos.x + this.msToPos(endTime - ms, speed)
				}
				ctx.drawImage(assets.image["balloon"],
					circlePos.x + size - 4,
					circlePos.y - h / 2 + 2,
					h / 61 * 115,
					h
				)
			}
		}else if(type === "drumroll" || type === "daiDrumroll"){
			fill = "#f3b500"
			if(type == "drumroll"){
				size = circleSize
				faceID = noteFace.small
			}else{
				size = bigCircleSize
				faceID = noteFace.big
			}
			endX = this.msToPos(endTime - circleMs, speed)
			drumroll = endX > 50 ? 2 : 1
			
			ctx.fillStyle = fill
			ctx.strokeStyle = "#000"
			ctx.lineWidth = 3
			ctx.beginPath()
			ctx.moveTo(circlePos.x, circlePos.y - size + 1.5)
			ctx.arc(circlePos.x + endX, circlePos.y, size - 1.5, Math.PI / -2, Math.PI / 2)
			ctx.lineTo(circlePos.x, circlePos.y + size - 1.5)
			ctx.fill()
			ctx.stroke()
		}
		if(!fade || fade < 1){
			// Main circle
			ctx.fillStyle = fill
			ctx.beginPath()
			ctx.arc(circlePos.x, circlePos.y, size - 1, 0, Math.PI * 2)
			ctx.fill()
			// Face on circle
			var drawSize = size
			if(faceID < 2){
				drawSize *= bigCircleSize / circleSize
			}
			ctx.drawImage(assets.image[drumroll ? "notes_drumroll" : "notes"],
				0, 172 * faceID,
				172, 172,
				circlePos.x - drawSize - 4,
				circlePos.y - drawSize - 4,
				drawSize * 2 + 8,
				drawSize * 2 + 8
			)
		}
		if(fade && !this.touchEnabled){
			ctx.globalAlpha = this.draw.easeOut(fade < 1 ? fade : 2 - fade)
			ctx.fillStyle = "#fff"
			ctx.beginPath()
			ctx.arc(circlePos.x, circlePos.y, size - 1, 0, Math.PI * 2)
			ctx.fill()
			ctx.globalAlpha = 1
		}
		if(!circle.isAnimated()){
			// Text
			var text = circle.getText()
			var textX = circlePos.x
			var textY = circlePos.y + 83 * mul
			ctx.font = lyricsSize + "px Kozuka"
			ctx.textBaseline = "middle"
			ctx.textAlign = "center"
			
			if(drumroll === 2){
				var longText = text.split("ー")
				text = longText[0]
				var text0Width = ctx.measureText(longText[0]).width
				var text1Width = ctx.measureText(longText[1]).width
			}
			
			ctx.fillStyle = "#fff"
			ctx.strokeStyle = "#000"
			ctx.lineWidth = 5
			ctx.strokeText(text, textX, textY)
			
			if(drumroll === 2){
				ctx.strokeText(longText[1], textX + endX, textY)
				
				ctx.lineWidth = 4
				var x1 = textX + text0Width / 2
				var x2 = textX + endX - text1Width / 2
				ctx.beginPath()
				ctx.moveTo(x1, textY - 2)
				ctx.lineTo(x2, textY - 2)
				ctx.lineTo(x2, textY + 1)
				ctx.lineTo(x1, textY + 1)
				ctx.closePath()
				ctx.stroke()
				ctx.fill()
			}
			
			ctx.strokeStyle = "#fff"
			ctx.lineWidth = 0.5
			
			ctx.strokeText(text, textX, textY)
			ctx.fillText(text, textX, textY)
			
			if(drumroll === 2){
				ctx.strokeText(longText[1], textX + endX, textY)
				ctx.fillText(longText[1], textX + endX, textY)
			}
		}
	}
	fillComboCache(){
		var fontSize = 58
		var letterSpacing = fontSize * 0.67
		var glyphW = 50
		var glyphH = 64
		var textX = 11
		var textY = 5
		var letterBorder = fontSize * 0.15
		
		this.comboCache.resize((glyphW + 1) * 20, glyphH + 1, this.ratio)
		for(var orange = 0; orange < 2; orange++){
			for(var i = 0; i < 10; i++){
				this.comboCache.set({
					w: glyphW,
					h: glyphH,
					id: orange + "combo" + i
				}, ctx => {
					ctx.scale(0.9, 1)
					if(orange){
						var grd = ctx.createLinearGradient(
							(glyphW - glyphH) / 2,
							0,
							(glyphW + glyphH) / 2,
							glyphH
						)
						grd.addColorStop(0.3, "#ff2000")
						grd.addColorStop(0.5, "#ffc321")
						grd.addColorStop(0.6, "#ffedb7")
						grd.addColorStop(0.8, "#ffffce")
						var fill = grd
					}else{
						var fill = "#fff"
					}
					this.draw.layeredText({
						ctx: ctx,
						text: i.toString(),
						fontSize: fontSize,
						fontFamily: this.font,
						x: textX,
						y: textY
					}, [
						{x: -2, y: -1, outline: "#000", letterBorder: letterBorder},
						{x: 3.5, y: 1.5},
						{x: 3, y: 1},
						{},
						{x: -2, y: -1, fill: "#fff"},
						{x: 3.5, y: 1.5, fill: fill},
						{x: 3, y: 1, fill: "rgba(0, 0, 0, 0.5)"},
						{fill: fill}
					])
				})
			}
		}
		this.globalAlpha = 0
		this.comboCache.get({
			ctx: this.ctx,
			x: 0,
			y: 0,
			w: 54,
			h: 77,
			id: "combo0"
		})
		this.globalAlpha = 1
	}
	toggleGogoTime(circle){
		this.gogoTime = circle.gogoTime
		this.gogoTimeStarted = circle.ms
		
		if(this.gogoTime){
			this.assets.fireworks.forEach(fireworksAsset => {
				fireworksAsset.setAnimation("normal")
				fireworksAsset.setAnimationStart(circle.ms)
				var length = fireworksAsset.getAnimationLength("normal")
				fireworksAsset.setAnimationEnd(length, () => {
					fireworksAsset.setAnimation(false)
				})
			})
			this.assets.fire.setAnimation("normal")
			var don = this.assets.don
			don.setAnimation("gogostart")
			var length = don.getAnimationLength("gogo")
			don.setUpdateSpeed(4 / length)
			var start = circle.ms - (circle.ms % this.beatInterval)
			don.setAnimationStart(start)
			var length = don.getAnimationLength("gogostart")
			don.setAnimationEnd(length, don.normalAnimation)
		}
	}
	drawGogoTime(){
		var ms = this.getMS()
		
		if(this.gogoTime){
			var circles = this.controller.parsedSongData.circles
			var lastCircle = circles[circles.length - 1]
			var endTime = lastCircle.getEndTime() + 3000
			if(ms >= endTime){
				this.toggleGogoTime({
					gogoTime: 0,
					ms: endTime
				})
			}
		}else{
			var animation = this.assets.don.getAnimation()
			var gauge = this.controller.getGlobalScore().gauge
			var cleared = Math.round(gauge / 2) - 1 >= 25
			if(animation === "gogo" || cleared && animation === "normal" || !cleared && animation === "clear"){
				this.assets.don.normalAnimation()
			}
			if(ms >= this.gogoTimeStarted + 100){
				this.assets.fire.setAnimation(false)
			}
		}
	}
	updateCombo(combo){
		var don = this.assets.don
		var animation = don.getAnimation()
		if(
			combo > 0
			&& combo % 10 === 0
			&& animation !== "10combo"
			&& animation !== "gogostart"
			&& animation !== "gogo"
		){
			don.setAnimation("10combo")
			var ms = this.controller.getElapsedTime()
			don.setAnimationStart(ms)
			var length = don.getAnimationLength("normal")
			don.setUpdateSpeed(4 / length)
			var length = don.getAnimationLength("10combo")
			don.setAnimationEnd(length, don.normalAnimation)
		}
	}
	displayScore(score, notPlayed, bigNote){
		if(!notPlayed){
			this.currentScore.ms = this.getMS()
			this.currentScore.type = score
			this.currentScore.bigNote = bigNote
		}
	}
	posToMs(pos, speed){
		var circleSize = 70 * this.slotPos.size / 106 / 2
		return 140 / circleSize * pos / speed
	}
	msToPos(ms, speed){
		var circleSize = 70 * this.slotPos.size / 106 / 2
		return speed / (140 / circleSize) * ms
	}
	togglePauseMenu(){
		if(this.controller.game.isPaused()){
			this.pauseMenu.style.display = "block"
			this.lastMousemove = this.controller.getElapsedTime()
			this.cursorHidden = false
			this.mouseIdle()
		}else{
			this.pauseMenu.style.display = ""
		}
	}
	drawTouch(){
		if(this.touchEnabled){
			var ms = this.getMS()
			var mul = this.ratio / this.pixelRatio
			
			var drumWidth = this.touchDrum.w * mul
			var drumHeight = this.touchDrum.h * mul
			if(drumHeight !== this.touchDrumHeight || drumWidth !== this.touchDrumWidth){
				this.touchDrumWidth = drumWidth
				this.touchDrumHeight = drumHeight
				this.touchDrumDiv.style.width = drumWidth + "px"
				this.touchDrumDiv.style.height = drumHeight + "px"
			}
			if(this.touch > ms - 100){
				if(!this.drumPadding){
					this.drumPadding = true
					this.touchDrumImg.style.backgroundPositionY = "7px"
				}
			}else if(this.drumPadding){
				this.drumPadding = false
				this.touchDrumImg.style.backgroundPositionY = ""
			}
		}
	}
	ontouch(event){
		for(let touch of event.changedTouches){
			event.preventDefault()
			var pageX = touch.pageX * this.pixelRatio
			var pageY = touch.pageY * this.pixelRatio
			
			var c = this.touchCircle
			var pi = Math.PI
			var inPath = () => this.ctx.isPointInPath(pageX, pageY)
			
			this.ctx.beginPath()
			this.ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, pi, 0)
			
			if(inPath()){
				if(pageX < this.winW / 2){
					this.touchNote("don_l")
				}else{
					this.touchNote("don_r")
				}
			}else{
				if(pageX < this.winW / 2){
					this.touchNote("ka_l")
				}else{
					this.touchNote("ka_r")
				}
			}
		}
	}
	touchNote(note){
		var keyboard = this.controller.keyboard
		var kbd = keyboard.getBindings()
		var ms = this.controller.game.getAccurateTime()
		this.touch = ms
		keyboard.setKey(kbd[note], false)
		keyboard.setKey(kbd[note], true, ms)
	}
	onmousemove(event){
		this.lastMousemove = this.controller.getElapsedTime()
		this.cursorHidden = false
	}
	mouseIdle(){
		var lastMouse = pageEvents.getMouse()
		if(lastMouse && !this.cursorHidden){
			if(this.controller.getElapsedTime() >= this.lastMousemove + 2000){
				this.cursor.style.top = lastMouse.clientY + "px"
				this.cursor.style.left = lastMouse.clientX + "px"
				this.cursor.style.pointerEvents = "auto"
				this.cursorHidden = true
			}else{
				this.cursor.style.top = ""
				this.cursor.style.left = ""
				this.cursor.style.pointerEvents = ""
			}
		}
	}
	changeBeatInterval(beatMS){
		this.beatInterval = beatMS
		this.assets.changeBeatInterval(beatMS)
	}
	getMS(){
		return this.controller.getElapsedTime()
	}
	clean(){
		this.draw.clean()
		this.assets.clean()
		this.titleCache.clean()
		this.comboCache.clean()
		
		if(this.multiplayer !== 2){
			pageEvents.remove(window, "resize")
			if(this.touchEnabled){
				pageEvents.remove(this.canvas, "touchstart")
				pageEvents.remove(this.touchFullBtn, "touchend")
				pageEvents.remove(this.touchPauseBtn, "touchend")
				this.gameDiv.classList.remove("touch-visible")
				document.getElementById("version").classList.remove("version-hide")
				delete this.touchDrumDiv
				delete this.touchDrumImg
				delete this.touchFullBtn
				delete this.touchPauseBtn
			}
		}
		pageEvents.mouseRemove(this)
		delete this.pauseMenu
		delete this.cursor
		delete this.gameDiv
		delete this.canvas
		delete this.ctx
	}
}
