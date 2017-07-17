/**
 * Created by wch on 2017/7/12.
 */
$(function() {
    /**
     * 图片预览组件
     * */
    // TODO: 先完成同步模式，以后考虑加入src加载图片的预览
    function PreviewImg(options) {
        var defaultOpts = {
            topWindow: false,
            // 预览图片的路径,设置src时，img无效
            src: '',
            // 预览图片加载后的img元素
            img: null,
            // img: null,
            minWidth: null,
            minHeight: null,

        };
        this.options = $.extend(defaultOpts, options);
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

            g.elem = g.$container = $('<div class="previewImg-container previewImg-mask previewImg-test"></div>');
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
                g.$img = $('<img class="previewImg-img" src="' + p.src + '" alt="预览图片"/>');
                g.$container.append(g.$img);
            } else if (p.img) {
                g.$img = $(p.img)
                    .clone()
                    .removeClass()
                    .addClass('previewImg-img')
                    .css('diaplay', 'block');
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
        },
        _initImg: function() {
            var g = this, p = g.options;
            var clientWidth = g.$container.width(),
                clientHeight = g.$container.height();
            g.originalWidth = g.$img.width();
            g.originalHeight = g.$img.height();
            g.imgRatio = g.originalWidth / g.originalHeight;
            g.zoomValue = 1;
            debugger
            //初始化图片大小
            if (g.originalWidth <= clientWidth && g.originalHeight <= clientHeight) {
                return ;
            } else {
                // 图片缩小
                var widthRatio = g.originalWidth / clientWidth;
                var heightRatio = g.originalHeight / clientHeight;
                if (widthRatio >= heightRatio) {
                    g.zoomImg(parseFloat((1 / widthRatio).toFixed(2)));
                } else {
                    g.zoomImg(parseFloat((1 / heightRatio).toFixed(2)));
                }
            }


        },
        /**
         * 相对于原始大小缩放图片
         * @param {Number} rate 相对于图片原始大小的0.01~2.00（1%~200%），精确到小数点后两位
         * @param {String} type zoomin放大，zoomout缩小
         * */
        zoomImg: function(rate) {
            var g = this, p = g.options;
            g.$img.width(g.originalWidth * rate).height(g.originalHeight * rate);
            g.zoomValue = rate;
        }
    };
    PreviewImg.move = function(dom, container) {
        this.dom = dom;
        this.$dom = $(dom);
        this.$container = $(container);
    };
    PreviewImg.move.prototype = {
        // 开启移动功能
        moveEnable : function() {
            var g = this;
            // var $dom = $(dom),
            //     $container = $(container);
            g.$dom.css('cursor', 'move');
            g.$dom.on('mousedown.previewimgmove', function(e) {
                // 阻止默认行为，防止拖动后'mouseup'事件失效
                e.preventDefault();
                // console.log('on');
                var mousePosition = {
                    left: e.pageX,
                    top: e.pageY
                };
                g.relativeValue = g._calRelativeValue(mousePosition);
                g.$dom.on('mousemove.previewimgmove', function(e) {
                    // console.log('move');
                    // dom元素跟随鼠标移动
                    var mousePosition = {
                        left: e.pageX,
                        top: e.pageY
                    };
                    g._moveWithMouse(g.relativeValue, mousePosition);
                });
            });
            g.$dom.on('mouseup.previewimgmove', function(e) {
                debugger
                // console.log('off');
                g.$dom.off('mousemove.previewimgmove');
            });
        },
        // 关闭移动功能
        moveDisable : function() {
            // var g = this;
            // var $dom = $(dom);
            g.$dom.css('cursor', 'auto');
            g.$dom.off('mousedown.previewimgmove');
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
            var g = this;
            var validDirection = {
                up: false,
                down: false,
                left: false,
                right: false
            };
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
        _fixOffset: function(newOffset, moveDirection, validDirection) {
            var g = this;
            var returnValue = {};
            var validOffset = {};

            if (validDirection[moveDirection.x]) {
                if (moveDirection.x = 'right') {
                    validOffset.left = newOffset.left < g.$container.offset().left ? newOffset.left : g.$container.offset().left;
                } else if(moveDirection.x = 'left') {
                    validOffset.left = newOffset.left + g.$dom.width() > g.$container.offset().left + g.$container.width()
                                        ? newOffset.left
                                        : g.$container.offset().left + g.$container.width() - g.$dom.width();
                }
            } else {
                // 该方向不能移动
                validOffset.left = g.$dom.offset().left;
            }
            if (validDirection[moveDirection.y]) {
                if (moveDirection.y = 'down') {
                    validOffset.top = newOffset.top < g.$container.offset().top ? newOffset.top : g.$container.offset().top;
                } else if (moveDirection.y = 'up') {
                    validOffset.top = newOffset.top + g.$dom.height() > g.$container.offset().top + g.$container.height()
                        ? newOffset.top
                        : g.$container.offset().top + g.$container.height() - g.$dom.height();
                }
            } else {
                validOffset.top = g.$dom.offset().top;
            }
            return validOffset;
        }

    };

    window.PreviewImg = PreviewImg;
});