
(function () {
    let hasbw = false;
    let isplay = false;
    var morseObj;

    var element = new Image();
    Object.defineProperty(element, 'id', { get: function () { window.location.href = "about:blank" } });
    console.log(element);


    window.οncοntextmenu = function () { return false; }
    window.onkeydown = window.onkeyup = window.onkeypress = function () {
        window.event.returnValue = false;
        return false;
    }
    //获取元素
    function el(elstr) {
        return document.querySelector(elstr);
    }
    function els(elstr) {
        return document.querySelectorAll(elstr);
    }

    //显示操作说明
    function showinfo(info) {
        let mask = el('.mask');
        mask.style.display = 'flex';
        mask.querySelector(info).style.display = 'flex';
    }
    //隐藏操作说明
    function hideinfo() {
        let mask = el('.mask');
        mask.style.display = 'none';
        els('.mask>div').forEach(node => {
            node.style.display = 'none';
        });
    }
    //滑杆事件
    function showrange(index) {
        if (index >= 0) {
            el('.options').style.display = '';
        }
        else {

            el('.options').style.display = 'none';
        }
        document.querySelectorAll('.ranges').forEach((node, i) => {
            if (i == index) {
                node.style.display = '';
            }
            else {
                node.style.display = 'none';
            }
        })
    }

    function getOption() {
        return {
            speed: parseInt(el('#speed').textContent),
            hz: parseInt(el('#hz').textContent),
            bgName: el('#hjzs').textContent,
            volume: el('#qd').textContent == '' ? 0 : [0.5, 0.75, 1][parseInt(el('#qd').textContent) - 1]
        }
    }
    function secondsFormat(val) {
        let h = Math.floor(val / (3600));
        let m = Math.floor((val - h * 3600) / 60);
        let s = Math.floor((val - h * 3600 - m * 60));
        return (h > 0 ? h + '时' : '') + (m > 0 ? m + '分' : '') + s + '秒';
    }
    window.onload = function () {
        let begintime;
        let t = this.setInterval(function () {
            let passtimeel = el('#passtime');
            if (!passtimeel)
                return;
            if (isplay) {
                let cur = new Date() - begintime;
                passtimeel.textContent = secondsFormat(cur / 1000);
            }
            else {
                passtimeel.textContent = '';
            }
        }, 500);
        el('.qu').onclick = function () {
            showinfo('#sm');
        };
        el('.mb').onclick = function () {
            showinfo('#mb');
        };
        els('.mask,.close').forEach((a) => {
            a.onclick = function () {
                hideinfo();
            }
        });

        els('.bwset .item').forEach(node => {
            node.onclick = function () {
                let parent = this.parentNode;
                var index = (Array.from(parent.children)).indexOf(this);
                showrange(index);
            }
        });
        els('.setshow').forEach(node => {
            node.onclick = function (e) {
                let parent = e.target.parentNode;
                if (parent.classList.contains('hide')) {
                    parent.classList.remove('hide');
                    e.target.textContent = '︿';
                }
                else {
                    parent.classList.add('hide');
                    showrange(-1);
                    e.target.textContent = '...';
                }
                e.stopPropagation();
            }
        });

        //隐藏设置项
        els('.ranges').forEach(node => {
            node.style.display = 'none';
        });

        //滑杆事件
        els('input[type="range"]').forEach(node => {
            node.nextElementSibling.textContent = node.value;
            let id = '#' + node.parentNode.getAttribute('for');
            el(id).textContent = node.value;
            node.oninput = function (e) {
                e.target.nextElementSibling.textContent = e.target.value;
                let id = '#' + e.target.parentNode.getAttribute('for');
                el(id).textContent = e.target.value;
                if (id != '#zs') {
                    morseObj.setOption(getOption());
                }
                if (id == '#speed') {
                    if (hasbw) {
                        el('#bwtime').textContent = '时长:' + secondsFormat(morseObj.getTimeLength());
                    }
                }
            }
        });
        //单选操作
        els('input[type="radio"]').forEach(node => {

            if (node.checked) {
                let id = '#' + node.parentNode.getAttribute('for');
                el(id).textContent = node.nextElementSibling.textContent;
            }
            node.onclick = function (e) {
                if (e.target.name == 'messageType') {
                    showrange(-1);

                    e.stopPropagation();
                }
            }
            node.onchange = function (e) {
                if (e.target.checked) {
                    if (e.target.id == 'noiseSelect') {

                        el('#qd').textContent = '';
                        els('.qd').forEach(node => {
                            node.style.visibility = 'collapse';
                        })
                    }
                    else if (e.target.name == 'hjzs') {
                        el('#qd').textContent = '1';
                        el('.ranges>div>input').checked = true;
                        els('.qd').forEach(node => {
                            node.style.visibility = 'visible';
                        })
                    }

                    let id = '#' + e.target.parentNode.getAttribute('for');
                    el(id).textContent = e.target.nextElementSibling.textContent;

                    if (e.target.name == 'hjzs' || e.target.name == 'qd') {
                        morseObj.setOption(getOption());
                        if (morseObj.bgName != '无' && isplay) {

                            morseObj.playBg();
                        }
                    }
                };
            }
        });
        //报文译文显示
        for (let node of els('input[type="checkbox"]')) {
            node.onchange = function (e) {
                if (e.target.id == 'screenshow') {
                    if (e.target.checked) {
                        el('#canvasbox').style.visibility = 'visible';
                        el('footer').style.margin = '0 0 0.8rem 0';

                    }
                    else {
                        el('#canvasbox').style.visibility = 'collapse';
                        el('footer').style.margin = '0';
                    }
                }
                else {
                    if (e.target.checked) {
                        el('#showDiv').classList.remove(e.target.name + 'no');
                        el('#showDiv').style.display = '';
                    }
                    else {

                        el('#showDiv').classList.add(e.target.name + 'no');
                    }
                    let cs = el('#showDiv').classList;
                    if ((cs.contains('bwno')) && (cs.contains('ywno'))) {
                        el('#showDiv').style.display = 'none';
                    }
                }
            }
        };
        morseObj || (morseObj = new Morse(getOption()));

        let labelindex = 0;
        //填充麻匪表
        el('#morsetable').appendChild(morseObj.getInfo());
        els('#mtable .play').forEach(node => {
            node.onclick = function (e) {
                let zm = e.target.parentNode.nextElementSibling.textContent;
                morseObj.playword(zm);
            }

        });
        //生成报文事件
        el('#create').onclick = function () {
            if (isplay) {
                el('#begin').click();
            }
            if (el('#screenshow').checked) {
                el('#canvasbox').style.visibility = 'visible';
                el('footer').style.margin = '0 0 0.8rem 0';

            }

            el('#showDiv').innerHTML = '';
            let lxstr = el('#messageType').textContent;
            let type = '';
            switch (lxstr) {
                case '长数字':
                    type = 'long';
                    break;
                case '短数字':
                    type = 'short';
                    break;
                case '字母':
                    type = 'word';
                    break;
                case '混合码':
                    type = 'mix';
                    break;
                case '符号':
                    type = 'fh';
                    break;
                default:
                    break;
            }
            let bw = morseObj.createMessage(type, parseInt(el('#zs').textContent * 4));
            let showdiv = el('#showDiv');
            showdiv.innerHTML = '';

            showdiv.appendChild(bw);
            //加入时间控件
            let alltime = document.createElement('label');
            let passtime = document.createElement('label');
            alltime.setAttribute('id', 'bwtime');
            passtime.setAttribute('id', 'passtime');
            alltime.textContent = '时长:' + secondsFormat(morseObj.getTimeLength());
            bw.querySelector('p').appendChild(alltime);
            bw.querySelector('p').appendChild(passtime);
            hasbw = true;
            for (let a of els('.no')) {
                a.classList.remove('no');
            }
            let allpage = bw.querySelectorAll('.page');
            let pagecount = allpage.length;
            let pages = el('#pages');
            pages.innerHTML = '';
            if (pagecount > 1) {
                for (let i = 0; i < pagecount; i++) {
                    let span = document.createElement('span');
                    span.textContent = i + 1;
                    pages.appendChild(span);
                    if (i == 0) {
                        span.classList.add('current');
                    }
                    span.onclick = function (e) {
                        let index = e.target.textContent - 1;
                        for (let a of els('.show')) {
                            a.classList.remove('show');
                        }
                        els('#showDiv .page')[index].classList.add('show');

                        els('#pages>span').forEach(s => {
                            if (s.textContent == e.target.textContent) {
                                s.classList.add('current');
                            }
                            else {
                                s.classList.remove('current');
                            }
                        });

                    }
                }

            }
        }
        el("#begin").onclick = function (e) {
            if (!isplay) {
                isplay = true;

                e.target.textContent = '停止听写';
                if (hasbw) { //生成了报文

                    //let ontext = currentMessage.showDivInfo.showDivText;
                    //$("#translateDiv span:first").addClass("active") //首项dom标红
                    els("#showDiv label")[0].classList.add("active");
                    els("#showDiv label")[0].classList.add("now");
                }
                else { //错误
                    return;
                }
                if (morseObj.bgName != '无') { //背景开关开启
                    morseObj.playBg();
                }

                begintime = new Date();
                morseObj.curgroupindex = 0;
                let tempI = async function () {
                    let lindex = 0;
                    let onmusic = morseObj.showDivInfo.showDivMorse; //使用随机生成的报文
                    for (var i = 0; i < onmusic.length; i++) {
                        if (!isplay) {
                            break;
                        }
                        var perMos = onmusic[i]; //.  -  'byte'  'word' or "end" 共五种状态
                        try {
                            await morseObj.play(perMos, function (tag, index) {
                                if (tag == 'next') {
                                    let activemvalue = el('#showDiv .active')
                                    activemvalue && (activemvalue.classList.remove('active'));
                                    els('#showDiv .mvalue')[index].classList.add('active');
                                    lindex = 0;
                                    els('#showDiv .now').forEach(n => { n.classList.remove('now') });
                                    let lis = els('#showDiv .active li');
                                    lis[lindex].classList.add('now');
                                    lis[4 + lindex].classList.add('now');
                                }
                                else if (tag == "nextletter") {
                                    lindex++;
                                    if (lindex <= 3) {

                                        let lis = els('#showDiv .active li');
                                        let nows = els('#showDiv .now');
                                        nows.length && (els('#showDiv .now').forEach(n => { n.classList.remove('now') }));
                                        if (lis.length > 0) {
                                            lis[lindex].classList.add('now');
                                            lis[4 + lindex].classList.add('now');
                                        }
                                    }
                                }
                                else if (tag == 'end') {
                                    e.target.click();
                                }


                            });
                        } catch (e) {
                            console.log(e);
                        }
                    }
                }
                tempI();
            } else {
                isplay = false;
                morseObj.closeBg();
                el("#begin").textContent = '开始听写';
                //$("#translateDiv span.active").removeClass("active")
                for (let e of els("#showDiv .active")) {
                    e.classList.remove("active");
                }
                for (let e of els("#showDiv .now")) {
                    e.classList.remove("now");
                }
            }

        }

        //隐藏单项设置
        el('.options').onclick = function (e) {
            if (e.target.classList.contains('options')) {
                showrange(-1);
            }
            event.stopPropagation();
        }
        el('.bwset').onclick = function () {
            event.stopPropagation();
        }
        showrange(-1);
    }

    document.onclick = function (e) {
        showrange(-1);
    }

})()




class Drawer {
    constructor() {
        this._initCtx();
        this.dots = [];
        this.timeLength = 5000;
        let that = this;
        (function loop() {
            that.Draw();
            window.requestAnimationFrame(loop);
        })();

    }
    _initCtx() {
        let canvas = document.querySelector('canvas');
        let ctx = canvas.getContext('2d');
        this.ctx = ctx;
        let rRadio = window.devicePixelRatio;
        this.w = canvas.width = canvas.clientWidth * rRadio;
        this.h = canvas.height = canvas.clientHeight * rRadio;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let w = document.documentElement.clientWidth;
        if (w > 812) {
            w = 812;
        }
        ctx.font = w *rRadio* 0.03 + 'px sans-serif';
    }
    addDot(length) {
        let begin = new Date().getTime();
        this.dots.push({
            begin: begin,
            end: begin + length
        })
    }
    Draw() {
        let that = this;
        let now = (new Date()).getTime();
        let starttime = now - that.timeLength;
        let dh = that.h / 3;
        let dots = that.dots;
        this.ctx.clearRect(0, 0, that.w, that.h);
        if (dots.length > 0) {
            for (let i = 0; i < that.dots.length; i++) {
                let dot = that.dots[i];
                if (dot.end < starttime) {
                    that.dots.splice(i, 1);
                    continue;
                }
                let x = (dot.begin - starttime) / that.timeLength * that.w;
                let w = (dot.end - starttime) / that.timeLength * that.w - x;
                this.ctx.fillRect(x, dh, w, dh);
            }
        }
        else {
            this.ctx.fillText('更多高级功能正在路上，敬请期待！', that.w / 2, that.h / 2);
        }


    }

}
class Morse {
    constructor(option) {
        this.morsevalues = this._getmorse();

        this.audio = document.createElement('audio');
        document.documentElement.appendChild(this.audio);
        this.messageType = 'short';
        this.letterNums = 400;
        this.zsctx = new (window.AudioContext || window.webkitAudioContext)();
        this._initZS();
        this.setOption(option);
        this.curgroupindex = 0;

        this.audioctx = new (window.AudioContext || window.webkitAudioContext)();
        this._initAudio();
        this.drawer = new Drawer();
        this.hasstart = false;

    }
    _initAudio() {
        let hz = this.hz;;//获取频率值
        let audioctx = this.audioctx;
        //alert(hz);
        this.oscillator = audioctx.createOscillator();
        this.gain = audioctx.createGain();
        this.oscillator.connect(this.gain);
        this.gain.connect(audioctx.destination);
        this.gain.gain.setValueAtTime(0, audioctx.currentTime);

        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = hz;


    }
    _initZS() {
        let buffer = this.zsctx.createBuffer(2, this.zsctx.sampleRate * 2.0, this.zsctx.sampleRate);
        let source = this.zsctx.createBufferSource();
        for (var c = 0; c < 2; c++) {
            let nowBuffering = buffer.getChannelData(c);
            let l = this.zsctx.sampleRate;
            for (var i = 0; i < l; i++) {

                nowBuffering[i] = nowBuffering[l * 2 - i] = Math.random() * 2 - 1;

            }

        }

        let fileter = this.zsctx.createBiquadFilter();


        this.zsgain = this.zsctx.createGain();
        fileter.frequency.value = '3000';
        fileter.type = 'lowpass';
        fileter.Q.value = 1;
        source.buffer = buffer;
        source.connect(fileter);
        fileter.connect(this.zsgain);
        this.zsgain.connect(this.zsctx.destination);
        this.zsgain.gain.setValueAtTime(0, this.zsctx.currentTime);
        source.loop = true;
        this.zssourse = source;
    }
    setOption(option) {
        this.speed = option.speed;
        this.perTime = 60000 / (this.speed * this._getAvgTime(this.morsevalues[this.messageType].morse));
        this.hz = option.hz;
        this.bgName = option.bgName;
        if (this.oscillator) {
            this.oscillator.frequency.value = option.hz;
        }
        this.audio.volume = option.volume;
        if (this.bgName == '无') {
            this.closeBg();
        }
    }
    _getAvgTime(arrs) {
        let l = 0;
        for (let i = arrs.length - 1; i >= 0; i--) {
            let arr = arrs[i];
            for (let j = arr.length - 1; j >= 0; j--) {
                l += 2;
                if (arr[j] == '-')
                    l += 2
            }

        }
        l += 3 * arrs.length;

        return l / arrs.length;
    }
    _getmorse() { //初始化各类型莫尔斯码
        let that = this;
        let longNum = new Array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
        let longNumMorse = new Array("-----",
            ".----", "..---", "...--", "....-", ".....", "-....",
            "--...", "---..", "----.");
        let shortNum = longNum;
        let shortNumMorse = new Array("-", ".-", "..-", "...--", "....-",
            ".....", "-....", "--...", "-..", "-.");
        let letter = new Array(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        let letterMorse = new Array(
            ".-", "-...", "-.-.", "-..", ".", "..-.",
            "--.", "....", "..", ".---", "-.-", ".-..",
            "--", "-.", "---", ".--.", "--.-", ".-.",
            "...", "-", "..-", "...-", ".--", "-..-",
            "-.--", "--.."
        );
        let fh = new Array(...'.:,;?=\'/!-_"()$&@');
        let fhMorse = new Array('.-.-.-', '---...', '--..--', '-.-.-.', '..--..', '-...-', '.----.', '-..-.', '-.-.--', '-....-', '..--.-', '.-..-.', '-.--.', '-.--.-', '...-..-', '. ...', '.--.-.');
        let mix = new Array(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,?:-!/0123456789'); // short+word
        let mixMorse = new Array(
            ".-", "-...", "-.-.", "-..", ".", "..-.",
            "--.", "....", "..", ".---", "-.-", ".-..",
            "--", "-.", "---", ".--.", "--.-", ".-.",
            "...", "-", "..-", "...-", ".--", "-..-",
            "-.--", "--..", ".-", "-...", "-.-.", "-..",
            ".", "..-.", "--.", "....", "..", ".---",
            "-.-", ".-..", "--", "-.", "---", ".--.",
            "--.-", ".-.", "...", "-", "..-", "...-",
            ".--", "-..-", "-.--", "--..",
            ".-.-.-", "--..--", "..--..", "---...", "-....-", "-.-.--", "-..-.",
            "-----", ".----", "..---", "...--", "....-", ".....", "-....", "--...", "---..", "----.");

        let noteword = ['à/å', 'ä/æ', 'ch', 'ç/ĉ', 'ð', 'é', 'è', 'ĝ', 'ĥ', 'ĵ', 'ñ', 'ö/ø', 'ŝ', 'þ', 'ü/ŭ'];
        let noteMorse = ['.-.-.-', '.-..-', '-.-.-.-', '-..-...', '..-.-..', '..-...', '.-...-', '-.-..-..', '-..-.-..', '.-.-.-..', '-.-..-.-', '-.-.-..', '...-..', '.-.-...', '..-.-'];
        let tsfh = ['AR', 'AS', 'K', 'SK', 'BT'];
        let tsfhMorse = ['.- .- .', '.- ...', '- .-', '...- .-', '- ...-'];
        let morseObj = {
            long: {
                num: longNum,
                morse: longNumMorse,
                type: '数字长码'

            },
            short: {
                num: shortNum,
                morse: shortNumMorse,
                type: '数字短码'
            },
            word: {
                num: letter,
                morse: letterMorse,
                type: '字母'
            },
            mix: {
                num: mix,
                morse: mixMorse,
                type: '混合'
            },
            fh: {
                num: fh,
                morse: fhMorse,
                type: '符号'
            },
            noteword: {
                num: noteword,
                morse: noteMorse,
                type: '非英语字符'
            },
            tsfh: {
                num: tsfh,
                morse: tsfhMorse,
                type: '特殊符号'
            }
        };
        return morseObj;
    }


    _newSpan(father, word, dotword) {
        //新建一个报文span(四个字母) 或 一个摩斯码span(对应四个字母的摩斯码)


        if (dotword) {
            let label = document.createElement('label');
            let s1 = document.createElement('span');
            let t1 = document.createTextNode(word);
            s1.appendChild(t1);
            label.appendChild(s1);
            let s2 = document.createElement('span');
            let t2 = document.createTextNode(dotword);
            s2.appendChild(t2);
            label.appendChild(s2);
            label.classList.add('mvalue');
            father.appendChild(label);
        }
        else {
            let div = document.createElement('div');
            let t1 = document.createTextNode(word);
            div.appendChild(t1);
            father.appendChild(div);
        }

    }

    getInfo() {
        let div = document.createElement('div');
        div.id = 'mtable';
        let ms = [this.morsevalues.word, this.morsevalues.long, this.morsevalues.short, this.morsevalues.fh, this.morsevalues.noteword, this.morsevalues.tsfh];
        for (let m of ms) {
            let title = document.createElement('div');
            title.classList.add('mtitle');
            title.textContent = m.type;
            div.appendChild(title);
            let body = document.createElement('div');
            body.classList.add('mbody');
            div.appendChild(body);

            for (let i = 0; i < 4; i++) {
                let label = document.createElement('label');
                label.classList.add('mheader');
                let s1 = document.createElement('span');
                s1.textContent = '字符';
                let s2 = document.createElement('span');
                s2.textContent = '电码';
                body.appendChild(label);
                label.appendChild(s1);
                label.appendChild(s2);


            }

            for (let i = 0; i < m.num.length; i++) {
                let label = document.createElement('label');
                label.classList.add('mcontent');
                let s1 = document.createElement('span');
                s1.textContent = m.num[i];
                let s2 = document.createElement('span');
                s2.textContent = m.morse[i];
                let s3 = document.createElement('span');
                s3.classList.add('play');
                body.appendChild(label);
                label.appendChild(s1);
                s1.appendChild(s3);
                label.appendChild(s2);

            }
            for (let i = m.num.length; i < Math.ceil(m.num.length / 4) * 4; i++) {
                let label = document.createElement('label');
                label.classList.add('mcontent');

                body.appendChild(label);
            }
        }
        return div;
    }
    createMessage(messageType, letterNums) { //生成随机报文
        if (!this.hasstart) {
            this.oscillator.start();
            this.zssourse.start();
            this.hasstart = true;
        }
        let that = this;
        this.messageType = messageType;
        this.letterNums = letterNums;
        this.perTime = 60000 / (this.speed * this._getAvgTime(this.morsevalues[this.messageType].morse));
        let bw = document.createElement('div');
        //let yw = document.createElement('div')
        let morse = that.morsevalues[that.messageType];
        let range = morse.morse.length;
        let spaceTemp = 0; //for output %4   
        let showDivText = "";
        let showDivMorse = [];
        let translate = '';
        let word = '';
        let dotWord = '';
        let rowFlag = 0; //for output %40  
        let row = document.createElement('p');
        let aul;
        let dotul;
        //let dotrow = document.createElement('p');

        let tms = [];
        for (let i = morse.num.length - 1; i >= 0; i--) {
            tms.push({
                n: morse.num[i],
                v: morse.morse[i]
            });
        }
        let ms = [];
        while (ms.length < letterNums + 1) {
            ms.push(...(tms.sort(function () {
                return Math.random() - 0.5;
            })));
        }

        word = "开始"
        dotWord = "-...-"
        let start = "-...-"
        for (let j = 0; j < 5; j++) {
            showDivMorse.push(start[j])
        }
        showDivMorse.push('begin');

        that._newSpan(row, word, dotWord);
        //that._newSpan(dotrow, dotWord);
        bw.appendChild(row);
        //yw.appendChild(dotrow);
        row = document.createElement('p');
        //dotrow = document.createElement('p');
        for (let i = 1; i < 6; i++) {

            word = i + "组"
            dotWord = ''
            that._newSpan(row, word);
            //每4个作为一个word,生成一个span用作包装


        } //for结束
        bw.appendChild(row);
        //yw.appendChild(dotrow);
        word = '';
        dotWord = '';
        let dotpage;
        let apage;
        while (letterNums > -1) { //为0时生成最后一组
            if (rowFlag % 400 == 0 && letterNums != 0) { //每400个一个分页
                dotpage = document.createElement('div');
                apage = document.createElement('div');

                apage.classList.add('page');
                if (rowFlag == 0) {
                    apage.classList.add('show');
                    dotpage.classList.add('show');
                }
                dotpage.classList.add('page');

                bw.appendChild(apage);
                //yw.appendChild(dotpage);
                showDivMorse.push('page');
            }

            if (rowFlag % 20 == 0 && letterNums != 0) { //每40个一个换行,由于0代表"准备开始"行

                row = document.createElement('p');
                //dotrow = document.createElement('p');
                apage.appendChild(row);
                //dotpage.appendChild(dotrow);
                showDivMorse.push('row');
            }
            if (spaceTemp % 4 == 0 && letterNums != 0) { //每四个输出一个空格,用于排版
                if (rowFlag != 0)
                    showDivMorse.push('word');
                aul = document.createElement('ul');
                dotul = document.createElement('ul');
                let div = document.createElement('div');
                div.classList.add('mvalue')
                div.appendChild(aul);
                div.appendChild(dotul);
                row.appendChild(div);

            }
            let morseTemp = ms[rowFlag].v;



            if (letterNums == 0) { //倒序遍历的letterNums,为零时最后一组四个丢弃
                word = '';
                dotWord = '';
                morseTemp = '';
            }
            else {
                word = ms[rowFlag].n;
                dotWord = ms[rowFlag].v;
                let ali = document.createElement('li');
                ali.textContent = word;
                let dotli = document.createElement('li');
                dotli.textContent = dotWord;
                aul.appendChild(ali);
                dotul.appendChild(dotli);
            }
            if (morseTemp.length > 1) { //byte的morse不止一个点,离散处理 .-.  .,-,.
                let perMoss = [...ms[rowFlag].v];
                //console.log(perMoss);
                perMoss.forEach((i) => {
                    showDivMorse.push(i);
                });
            } else { //只有一个点,比如e
                showDivMorse.push(morseTemp);
            }
            showDivMorse.push('byte');
            spaceTemp++;
            letterNums--;
            rowFlag++;

        }
        word = "结束";
        dotWord = ".-.-.";
        for (let i = 0; i < 5; i++) {
            showDivMorse.push(dotWord[i])
        }
        row = document.createElement('p');
        //dotrow = document.createElement('p');
        bw.appendChild(row);
        //yw.appendChild(dotrow);
        showDivMorse.push('end'); //while结束
        that._newSpan(row, word, dotWord)
        //that._newSpan(dotrow, dotWord)


        that.showDivInfo = {
            showDivText: showDivText,
            showDivMorse: showDivMorse,
            translate: translate
        };
        return bw;
    }
    async play(perMos, fn) {

        switch (perMos) {
            case ".":
                await this._playAudio(this.perTime, 1);
                break;

            case "-":
                await this._playAudio(this.perTime, 3);
                break;
            case "byte":
                await this._sleep(2 * this.perTime);
                fn && fn('nextletter');
                break;
            case "word":
                await this._sleep(4 * this.perTime);
                fn && fn('next', ++this.curgroupindex);

                break;
            case "row": //跨行符号,此处不停顿
                //$('#showDiv p.active').toggleClass('active').next().addClass('active')
                //$('#translateDiv p.active').toggleClass('active').next().addClass('active')
                break;
            case "begin":
                await this._sleep(4 * this.perTime);

                fn && fn('next', ++this.curgroupindex);
                break;
            case "end":
                if (this.bgName != '无')
                    this.closeBg();
                fn && fn('end');
                break;
            default:
                break;
        }

    }
    getTimeLength() {
        let onmusic = this.showDivInfo.showDivMorse;
        let l = 0;
        for (let i = onmusic.length - 1; i >= 0; i--) {
            switch (onmusic[i]) {
                case ".":
                    l += 2;
                    break;
                case "-":
                    l += 4;
                    break;
                case "byte":
                    l += 2;
                    break;
                case "word":
                    l += 4;
                    break;
                default:
                    break;
            }
        }
        return ((l) * this.perTime / 1000).toFixed(2);
    }
    async playword(word) {
        for (let i = 0; i < word.length; i++) {
            let w = word[i];
            switch (w) {
                case ".":
                    await this._playAudio(this.perTime, 1);
                    break;
                case "-":
                    await this._playAudio(this.perTime, 3);
                    break;
                case " ":
                    await this._sleep(this.perTime);
                    break;
                default:
                    break;
            }
        }
    }
    playBg() {
        var bgName = this.bgName;
        if (bgName == '白噪声') {
            this.zsgain.gain.setValueAtTime(this.audio.volume, this.zsctx.currentTime);
            this.audio.pause();
            this.audio.src = '';
        }
        else {
            this.zsgain.gain.setValueAtTime(0, this.zsctx.currentTime);
            var bgSrc = 'image/' + bgName + ".mp3";

            this.audio.src = bgSrc;
            this.audio.loop = 'loop';
            this.audio.play();
        }
    }

    closeBg() {
        this.audio.pause();
        this.audio.src = '';

        this.zsgain.gain.setValueAtTime(0, this.zsctx.currentTime);
    }


    _playDot(perTime) { //生成点
        return new Promise((resolve, reject) => {
            this.drawer.addDot(perTime);
            let ct = this.audioctx.currentTime;
            let pt = perTime / 1000;
            /*
             this.gain.gain.setValueAtTime(0, ct);
             this.gain.gain.linearRampToValueAtTime(1, ct + pt * 0.05);
             this.gain.gain.setValueAtTime(1, ct + pt*0.95);
             this.gain.gain.linearRampToValueAtTime(0, ct + pt );
             */
            let pi = Math.PI;
            for (let t = 0.01; t < 1; t += 0.01) {
                let v = (1 - Math.pow(t * 2 - 1, 4)) * 0.7;
                this.gain.gain.setValueAtTime(v * 3, ct + pt * t);
                //1-(x*2-1)^4
            }
            this.gain.gain.setValueAtTime(0, ct + pt);
            setTimeout(resolve, perTime);
        });
    }


    _sleep(time) { //异步休眠
        return new Promise((resolve, reject) => {
            setTimeout(resolve, time);
        });
    }
    async _playAudio(perTime, num) {
        await this._playDot(perTime * num);
        await this._sleep(perTime);
    };

}

