/**
 * Created by wch on 2017/7/12.
 */
$(function() {
    /**
     * 图片预览组件
     * */
    // TODO: 修复bug：图片先放大到超出边界再缩小，可能出现缩略图镜框定位错误的问题
    // TODO: 先完成同步模式，以后考虑加入src加载图片的预览
    // TODO: 完善组件的事件接口
    function PreviewImg(options) {
        var defaultOpts = {
            topWindow: false,
            // 预览图片的路径,设置src时，img无效
            src: '',
            // 预览图片加载后的img元素
            img: null,
            // 缩略图对象
            miniImgObj: null,
            // img: null,
            minWidth: null,
            minHeight: null
        };
        this.options = $.extend(defaultOpts, options);

        // 图片等比例缩放时，先充满遮罩的方向:'x'或'y'
        this.firstFullOf = null;
        this.imgOverflow = false;

        this._create();
        this._init();
    }

    PreviewImg.prototype = {
        constructor: PreviewImg,
        _create: function() {
            var g = this, p = g.options;
            g._render();
            g._initEvents();
        },
        _render: function() {
            var g = this, p = g.options;

            g.elem = g.$container = $('<div class="previewImg-container previewImg-mask"></div>');
            g.dom = g.elem[0];
            g._renderImg();
            g.$btnClose = $('<div class="previewImg-closeBtn"><span class="icon icon-close"></span></div>')
                .appendTo(g.$container);
            g.$zoomTip = $('<div class="previewImg-zoomTip previewImg-zoomTip--hide"></div>')
                .appendTo(g.$container);

            // 是否渲染到window.top
            if (p.topWindow) {
                g.$container.appendTo(window.top.document.body);
                // window.top.document.body.append(g.$container[0]);
            } else {
                g.$container.appendTo(document.body);
                // document.body.append(g.$container[0]);
            }
        },
        _renderImg: function() {
            var g = this, p = g.options;
            if (p.src && p.src !== '') {
                g.$img = $('<img class="previewImg-img previewImg-img--center" src="' + p.src + '" alt="预览图片"/>');
                g.$container.append(g.$img);
            } else if (p.img) {
                g.$img = $(p.img)
                    .clone()
                    .removeClass()
                    .addClass('previewImg-img previewImg-img--center')
                    .css('display', 'block');
                g.$container.append(g.$img);
            } else {
                console.warn('图片资源错误！');
            }
        },
        _initEvents: function() {
            var g = this, p = g.options;

            // 鼠标滚轮事件
            var tipInterval;
            g.$container.on('mousewheel', function(e) {

                var newZoomValue;
                var wheelDelta = e.originalEvent.wheelDelta;
                var changeValue = 0.03;
                if (wheelDelta > 0) {
                    // 上滚，放大
                    newZoomValue = g.zoomValue + changeValue;
                } else {
                    // 下滚，缩小
                    newZoomValue = g.zoomValue - changeValue;
                }
                g.zoomImg(parseFloat(newZoomValue.toFixed(2)));

                // 显示当前图片的缩放百分比
                g.$zoomTip.html(parseInt(newZoomValue * 100).toString() + '%');
                if (!tipInterval) {
                    g.$zoomTip.removeClass('previewImg-zoomTip--hide');
                } else {
                    clearInterval(tipInterval);
                }
                tipInterval = setTimeout(function() {
                    g.$zoomTip.addClass('previewImg-zoomTip--hide');
                    tipInterval = null;
                }, 1000);

            });

        },
        _init: function() {
            var g = this, p = g.options;
            g._initImg();
            // 图片拖动管理
            g.moveObj = new PreviewImg.move(g.$img[0], g.$container[0]);

            // 创建缩略图
            p.miniImgObj = new PreviewImg.miniImg({
                previewImgObj: g,
                display: false
            });

            // 绑定预览图片移动的处理函数
            g.moveObj.$dom.on('dommove.previewimgmove', function() {
                p.miniImgObj.setFramePosition();
            });
        },
        _initImg: function() {
            var g = this, p = g.options;
            var clientWidth = g.$container.width(),
                clientHeight = g.$container.height(),
                widthRatio,
                heightRatio;
            g.originalWidth = g.$img.width();
            g.originalHeight = g.$img.height();
            g.imgRatio = g.originalWidth / g.originalHeight;
            g.zoomValue = 1;

            widthRatio = g.originalWidth / clientWidth;
            heightRatio = g.originalHeight / clientHeight;
            if (widthRatio >= heightRatio) {
                g.firstFullOf = 'x';
            } else {
                g.firstFullOf = 'y';
            }
            //初始化图片大小
            if (g.originalWidth <= clientWidth && g.originalHeight <= clientHeight) {
                return ;
            } else {
                // 图片缩小
                if (g.firstFullOf === 'x') {
                    // g.zoomImg(parseFloat((1 / widthRatio).toFixed(2)));
                    g.$img.width(g.originalWidth / widthRatio).height(g.originalHeight / widthRatio);
                    g.zoomValue = parseFloat((1 / widthRatio).toFixed(2));
                } else {
                    // g.zoomImg(parseFloat((1 / heightRatio).toFixed(2)));
                    g.$img.width(g.originalWidth / heightRatio).height(g.originalHeight / heightRatio);
                    g.zoomValue = parseFloat((1 / heightRatio).toFixed(2));
                }
            }

        },
        /**
         * 图片是否超出预览容器
         * */
        hasOverflow: function() {
            var g = this, p = g.options;
            if (g.$img.width() > g.$container.width() || g.$img.height() > g.$container.height()) {
                return true;
            } else {
                return false;
            }
        },
        /**
         * @Function  相对于原始大小缩放图片
         * @param {Number} rate 相对于图片原始大小的0.01~2.00（1%~200%），精确到小数点后两位
         * @param {String} type zoomin放大，zoomout缩小
         * */
        zoomImg: function(rate) {
            var g = this, p = g.options;
            var imgNewWidth = g.originalWidth * rate,
                imgNewHeight = g.originalHeight * rate;

            // 获取图片焦点的比例
            g.focusRate = g._getFocusRate();

            g.$img.width(imgNewWidth).height(imgNewHeight);
            g.zoomValue = rate;
            g.imgOverflow = g.hasOverflow();

            // 设置图片能否移动
            if (g.moveObj && g.imgOverflow && !g.moveObj.getMoveState()) {
                g.moveObj.moveEnable();

            } else if (g.moveObj && !g.imgOverflow) {
                g.moveObj.moveDisable();
                g.$img
                    .removeClass('previewImg-img--offset')
                    .addClass('previewImg-img--center');
                g._clearOffsetAttr();
            }

            g._imgZoomPosition();

            // 缩略图镜框缩放
            if (p.miniImgObj && g.imgOverflow) {
                p.miniImgObj.show();
                p.miniImgObj.setFrameSize();
                p.miniImgObj.setFramePosition();
            } else if (p.miniImgObj) {
                p.miniImgObj.hide();
            }
        },
        /**
         * 获取图片在容器中焦点的宽高比例值
         * */
        _getFocusRate: function() {
            var g = this, p = g.options;

            var focusX = g.$container.offset().left + g.$container.width() / 2,
                focusY = g.$container.offset().top + g.$container.height() / 2;
            var widthRate = (focusX - g.$img.offset().left) / g.$img.width(),
                heightRate = (focusY - g.$img.offset().top) / g.$img.height();

            var focusRate = {
                widthRate: widthRate,
                heightRate:　heightRate
            };
            return focusRate;
        },
        /**
         * 缩放后图片重定位：
         * 1. 缩放后图片焦点位置不变。
         * 2. 缩小后图片可能出现一侧超出一侧留有空位的情况，此时需要改变焦点位置重定位。
         * */
        _imgZoomPosition: function(rate) {
            var g = this, p = g.options;
            var imgWidth = g.$img.width(),
                imgHeight = g.$img.height();



            // 设置图片焦点位置，和缩放前一致
            if (g.hasOverflow()) {
                g.$img.offset({
                    left: (g.$container.offset().left + g.$container.width() / 2) - g.$img.width() * g.focusRate.widthRate,
                    top: (g.$container.offset().top + g.$container.height() / 2) - g.$img.height() * g.focusRate.heightRate
                });
            }

            // 改变焦点，保证一侧超出时另一侧无空位
            var direction = PreviewImg.boundaryOver(g.$container[0], g.$img[0]);
            if (g.$container.width() < imgWidth && (direction.left || direction.right)) {
                var offsetLeft, offsetTop;
                if (direction.left) {
                    offsetLeft = g.$container.offset().left;
                } else {
                    offsetLeft = g.$container.offset().left + g.$container.width() - g.$img.width();
                }
                g.$img.offset({
                    left: offsetLeft,
                    top: g.$img.offset().top
                });
            }
            if (g.$container.height() < imgHeight && (direction.top || direction.bottom)) {
                if (direction.top) {
                    offsetTop = g.$container.offset().top;
                } else {
                    offsetTop = g.$container.offset().top + g.$container.height() - g.$img.height();
                }
                g.$img.offset({
                    left: g.$img.offset().left,
                    top: offsetTop
                });
            }
        },
        /**
         * 清除设置offset定位时附加的属性，保证图片的center定位正确
         * */
        _clearOffsetAttr: function() {
            var g = this, p = g.options;
            g.$img.css({
                top: 0,
                left: 0,
                position: 'absolute'
            });
        },
        /**
         * @Function 根据缩略图镜框移动的位置设置预览图片的位置
         * */
        setImgPosition: function() {
            var g = this, p = g.options;
            var miniImgObj = p.miniImgObj,
                $imgBox = miniImgObj.$imgBox,
                $frame = miniImgObj.$frame;
            var rate = g.$img.width() / $imgBox.width();
            // left值
            if ($frame.width() < $imgBox.width()) {
                var imgOffsetLeft = ($imgBox.offset().left - $frame.offset().left) * rate + g.$container.offset().left;
                g.$img.offset({left: imgOffsetLeft, top: g.$img.offset().top});
            }
            // top值
            if ($frame.height() < $imgBox.height()) {
                var imgOffsetTop = ($imgBox.offset().top - $frame.offset().top) * rate + g.$container.offset().top;
                g.$img.offset({left: g.$img.offset().left, top: imgOffsetTop});
            }
        }
    };

    /**
     * @Function boundaryOver 判断目标元素的边界是否超出容器元素
     * @param {dom} target 目标元素
     * @param {dom} container 容器元素
     * @return {Object} direction
     * */
    PreviewImg.boundaryOver = function(target, container) {
        var direction = {};
        var $target = $(target),
            $container = $(container);
        var targetOffset = $target.offset(),
            containerOffset = $container.offset();

        direction.left = targetOffset.left < containerOffset.left;
        direction.right = targetOffset.left + $target.width() > containerOffset.left + $container.width();
        direction.top = targetOffset.top < containerOffset.top;
        direction.bottom = targetOffset.top + $target.height() > containerOffset.top + $container.height();

        return direction;
    };

    /**
     * 预览图片的缩略图
     * @class MiniImg
     * */
    var MiniImg = function(options) {
        var defaultOpts = {
            // 预览图片组件的实例，此时src和img属性无效
            previewImgObj: null,
            src: null,
            img: null,
            // 缩略图宽高占屏幕宽度的比例
            percent: 20,
            // 遮罩的不透明度，实际设置的是背景色的rgba值
            opacity: null,
            // 创建后是否自动显示
            display: true
        };
        this.options = $.extend({}, defaultOpts, options);
        this._create();
        this._init();
    };
    MiniImg.prototype = {
        _create: function() {
            var g = this, p = g.options;
            g._render();
            g._initEvents();
        },
        _render: function() {
            var g = this, p = g.options;
            g.$container = $('<div class="miniImg miniImg-mask"></div>');
            g._renderImgBox();
            g.$closeBtn = $('<div class="miniImg-closeBtn"><span class="icon icon-close"></span></div>')
                .appendTo(g.$container);
            // 插入到预览组件后面
            g.$container.insertAfter(p.previewImgObj.dom);
        },
        _renderImgBox: function() {
            var g = this, p = g.options;
            if (p.previewImgObj) {
                p.src = p.previewImgObj.options.src || p.src;
                p.img = p.previewImgObj.options.img || p.img;
            }
            if (typeof p.src === 'string' && p.src !== '') {
                g.$imgBox = $('<div class="miniImg-imgBox"></div>');
                g.$imgBox
                    .append('<img class="miniImg-img" src="' + p.src + '" alt="缩略图"/>')
                    .append('<div class="miniImg-frame"></div>');
            } else if (p.img) {
                g.$imgBox = $('<div class="miniImg-imgBox"></div>');
                var imgElem = $.clone(p.img);
                $(imgElem)
                    .appendTo(g.$imgBox)
                    .removeClass()
                    .addClass('miniImg-img')
                    .attr('alt', '缩略图');
                g.$imgBox.append('<div class="miniImg-frame"></div>');
            }
            g.$frame = g.$imgBox.find('.miniImg-frame');
            g.$container.append(g.$imgBox);
        },
        _initEvents: function() {
            var g = this, p = g.options;
        },
        _init: function() {
            var g = this, p = g.options;
            // 缩略图容器的尺寸
            g.$container
                .css({
                    'width': p.percent + '%',
                    'height': p.percent + '%'
                });
            // 图片的尺寸
            var imgRatio = p.previewImgObj.imgRatio;
            switch (p.previewImgObj.firstFullOf) {
                case 'x':
                    g.$imgBox.css({
                        width: '100%',
                        height: g.$container.width() / imgRatio
                    });
                    break;
                case 'y':
                    g.$imgBox.css({
                        width: g.$container.height() * imgRatio,
                        height: '100%'
                    });
                    break;
                default:
                    break;
            }
            // 缩略图定位
            g._setPosition();
            // 初始化边框
            g.setFrameSize();
            // 设置边框位置
            g.setFramePosition();

            // 设置镜框可移动
            g.moveObj = new PreviewImg.move(g.$frame[0], g.$imgBox[0], {
                directionValidType: 'mini'
            });
            g.moveObj.moveEnable();
            g.moveObj.$dom.on('dommove.previewimgmove', function() {
                p.previewImgObj.setImgPosition();
            });

            if (p.display) {
                g.show();
            } else {
                g.hide();
            }
        },
        _setPosition: function() {
            var g = this, p = g.options;
            var previewImgCt = p.previewImgObj.$container,
                miniImgCt = g.$container;
            var offsetLeft = previewImgCt.offset().left,
                offsetTop = previewImgCt.offset().top,
                width = previewImgCt.width(),
                height = previewImgCt.height();
            var left = offsetLeft + width - miniImgCt.width() - 5,
                top = offsetTop + height - miniImgCt.height() - 5;
            miniImgCt.offset({left: left, top: top});
        },
        setFrameSize: function() {
            var g = this, p = g.options;
            var previewImgObj = p.previewImgObj,
                $imgCt = previewImgObj.$container,
                $img =  previewImgObj.$img;
            // 宽度计算
            if ($img.width() <= $imgCt.width()) {
                g.$frame.width(g.$imgBox.width());
            } else {
                var frameWidth = g.$imgBox.width() * ($imgCt.width() / $img.width());
                g.$frame.width(frameWidth);
            }
            // 高度计算
            if ($img.height() <= $imgCt.height()) {
                g.$frame.height(g.$imgBox.height());
            } else {
                var frameHeight = g.$imgBox.height() * ($imgCt.height() / $img.height());
                g.$frame.height(frameHeight);
            }
        },
        setFramePosition: function() {
            var g = this, p = g.options;
            var previewImgObj = p.previewImgObj,
                $imgCt = previewImgObj.$container,
                $img =  previewImgObj.$img;
            var rate = g.$imgBox.width() / $img.width();

            // left值
            if ($img.width() > $imgCt.width()) {
                var frameOffsetLeft = ($imgCt.offset().left - $img.offset().left) * rate + g.$imgBox.offset().left;
                g.$frame.offset({left: frameOffsetLeft, top: g.$frame.offset().top});
            } else {
                g.$frame.offset({left: g.$imgBox.offset().left, top: g.$frame.offset().top});
            }
            // top值
            if ($img.height() > $imgCt.height()) {
                var frameOffsetTop = ($imgCt.offset().top - $img.offset().top) * rate + g.$imgBox.offset().top;
                g.$frame.offset({left: g.$frame.offset().left, top: frameOffsetTop});
            } else {
                g.$frame.offset({left: g.$frame.offset().left, top: g.$imgBox.offset().top});
            }

        },
        hide: function() {
            var g = this, p = g.options;
            g.$container.hide();
        },
        show: function() {
            var g = this, p = g.options;
            g.$container.show();
        },
        destory: function() {
            var g = this, p = g.options;
            g.$container.remove();
            delete g;
        }
    };
    PreviewImg.miniImg = MiniImg;

    /**
     * 元素拖动
     * @param {Object} dom 移动的dom元素
     * @param {Object} container 作为容器的dom元素
     * @param {Object} options 配置项
     * */
    PreviewImg.move = function(dom, container, options) {
        this.dom = dom;
        this.$dom = $(dom);
        this.$container = $(container);
        this.movable = false;
        var defaultOpts = {
            // 验证可移动方向的规则：'preview'是预览图，'mini'是缩略图
            directionValidType: 'preview'
        };
        this.options = $.extend({}, defaultOpts, options);
    };
    PreviewImg.move.prototype = {
        // 开启移动功能
        moveEnable : function() {
            var g = this;
            g.movable = true;
            g.$dom.css('cursor', 'move');
            g.$dom.on('mousedown.previewimgmove', function(e) {
                // 阻止默认行为，防止拖动后'mouseup'事件失效
                e.preventDefault();
                var mousePosition = {
                    left: e.pageX,
                    top: e.pageY
                };
                g.relativeValue = g._calRelativeValue(mousePosition);
                g.$dom.on('mousemove.previewimgmove', function(e) {
                    // dom元素跟随鼠标移动
                    var mousePosition = {
                        left: e.pageX,
                        top: e.pageY
                    };
                    g._moveWithMouse(g.relativeValue, mousePosition);
                    // 触发元素移动事件
                    g.$dom.trigger('dommove.previewimgmove');
                });
            });
            g.$dom.on('mouseup.previewimgmove', function(e) {
                g.$dom.off('mousemove.previewimgmove');
            });
        },
        // 关闭移动功能
        moveDisable : function() {
            var g = this;
            g.movable = false;
            g.$dom.css('cursor', 'auto');
            g.$dom.off('mousedown.previewimgmove');
        },
        getMoveState: function() {
            return this.movable;
        },
        // 计算鼠标和dom元素左上角的相对位置
        _calRelativeValue: function(mousePosition) {
            var g = this;
            var relativeValue;
            var imgLeft = g.$dom.offset().left,
                imgTop = g.$dom.offset().top;
            relativeValue = {
                x: mousePosition.left - imgLeft,
                y: mousePosition.top - imgTop
            };
            return relativeValue;
        },
        // dom元素跟随鼠标移动
        _moveWithMouse: function(relativeValue, mousePosition) {
            var g = this;
            var imgLeft = g.$dom.offset().left,
                imgTop = g.$dom.offset().top;
            var oldOffset = {
                left: imgLeft,
                top: imgTop
            };
            var newOffset = {
                left: mousePosition.left - relativeValue.x,
                top: mousePosition.top - relativeValue.y
            };
            // 判断图片移动方向
            var validDirection = g.getValidDirection();
            // 判断实际移动方向
            var moveDirection = g.getMoveDirection(oldOffset, newOffset);

            var validOffset = g._fixOffset(newOffset, moveDirection, validDirection);

            g.$dom.offset({
                left: validOffset.left,
                top: validOffset.top
            });

        },
        // 验证可移动的方向
        getValidDirection: function() {
            var g = this, p = g.options;
            var validDirection = {
                up: false,
                down: false,
                left: false,
                right: false
            };
            if (p.directionValidType == 'preview') {
                if (g.$dom.offset().left < g.$container.offset().left) {
                    validDirection.right = true;
                }
                if (g.$dom.offset().left + g.$dom.width() > g.$container.offset().left + g.$container.width()) {
                    validDirection.left = true;
                }
                if (g.$dom.offset().top < g.$container.offset().top) {
                    validDirection.down = true;
                }
                if (g.$dom.offset().top + g.$dom.height() > g.$container.offset().top + g.$container.height()) {
                    validDirection.up = true;
                }
            } else if (p.directionValidType == 'mini') {
                if (g.$dom.offset().left > g.$container.offset().left) {
                    validDirection.left = true;
                }
                if (g.$dom.offset().left + g.$dom.width() < g.$container.offset().left + g.$container.width()) {
                    validDirection.right = true;
                }
                if (g.$dom.offset().top > g.$container.offset().top) {
                    validDirection.up = true;
                }
                if (g.$dom.offset().top + g.$dom.height() < g.$container.offset().top + g.$container.height()) {
                    validDirection.down = true;
                }
            }

            return validDirection;
        },
        // 得到图片实际移动方向
        getMoveDirection: function(oldOffset, newOffset) {
            var g = this;
            var moveDirection = {};
            moveDirection.x = newOffset.left < oldOffset.left ? 'left' : 'right';
            moveDirection.y = newOffset.top < oldOffset.top ? 'up' : 'down';
            return moveDirection;
        },
        // 防止元素移动时超出边界
        _fixOffset: function(newOffset, moveDirection, validDirection) {
            var g = this, p = g.options;
            var returnValue = {};
            var validOffset = {};
            if (p.directionValidType == 'preview') {
                if (validDirection[moveDirection.x]) {
                    if (moveDirection.x == 'right') {
                        validOffset.left = newOffset.left < g.$container.offset().left ? newOffset.left : g.$container.offset().left;
                    } else if(moveDirection.x == 'left') {
                        validOffset.left = newOffset.left + g.$dom.width() > g.$container.offset().left + g.$container.width()
                            ? newOffset.left
                            : g.$container.offset().left + g.$container.width() - g.$dom.width();
                    }
                } else {
                    // 该方向不能移动
                    validOffset.left = g.$dom.offset().left;
                }
                if (validDirection[moveDirection.y]) {
                    if (moveDirection.y == 'down') {
                        validOffset.top = newOffset.top < g.$container.offset().top ? newOffset.top : g.$container.offset().top;
                    } else if (moveDirection.y == 'up') {
                        validOffset.top = newOffset.top + g.$dom.height() > g.$container.offset().top + g.$container.height()
                            ? newOffset.top
                            : g.$container.offset().top + g.$container.height() - g.$dom.height();
                    }
                } else {
                    validOffset.top = g.$dom.offset().top;
                }
            } else if (p.directionValidType == 'mini') {
                if (validDirection[moveDirection.x]) {
                    if (moveDirection.x == 'left') {
                        validOffset.left = newOffset.left > g.$container.offset().left ? newOffset.left : g.$container.offset().left;
                    } else if(moveDirection.x == 'right') {
                        validOffset.left = newOffset.left + g.$dom.width() < g.$container.offset().left + g.$container.width()
                            ? newOffset.left
                            : g.$container.offset().left + g.$container.width() - g.$dom.width();
                    }
                } else {
                    // 该方向不能移动
                    validOffset.left = g.$dom.offset().left;
                }
                if (validDirection[moveDirection.y]) {
                    if (moveDirection.y == 'up') {
                        validOffset.top = newOffset.top > g.$container.offset().top ? newOffset.top : g.$container.offset().top;
                    } else if (moveDirection.y == 'down') {
                        validOffset.top = newOffset.top + g.$dom.height() < g.$container.offset().top + g.$container.height()
                            ? newOffset.top
                            : g.$container.offset().top + g.$container.height() - g.$dom.height();
                    }
                } else {
                    validOffset.top = g.$dom.offset().top;
                }
            }
            return validOffset;
        }

    };

    window.PreviewImg = PreviewImg;
});