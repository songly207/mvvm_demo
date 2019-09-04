function Compile(el, vm) {
    this.$vm = vm;  //mvvm 实例对象
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        //转化为文档碎片
        this.$fragment = this.node2Fragment(this.$el);
        this.init(); // 编译文档碎片
        this.$el.appendChild(this.$fragment);
    }
}
// 模板指令编译器
Compile.prototype = {
    constructor: Compile,
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    compileElement: function(el) {
        var childNodes = el.childNodes,
            me = this;
        // 遍历所有节点及其子节点，进行扫描解析编译，调用对应的指令渲染函数进行数据渲染，并调用对应的指令更新函数进行绑定
        [].slice.call(childNodes).forEach(function(node) {
            var text = node.textContent;
            var reg = /\{\{(.*)\}\}/;

            if (me.isElementNode(node)) {
                // 编译元素节点
                me.compile(node);

            } else if (me.isTextNode(node) && reg.test(text)) {
                // 编译文本节点
                me.compileText(node, RegExp.$1.trim());
            }

            if (node.childNodes && node.childNodes.length) {
                // 编译带有子节点的 元素节点   递归调用
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        var nodeAttrs = node.attributes,
            me = this;
        // 编译 节点属性 集合
        [].slice.call(nodeAttrs).forEach(function(attr) {
            var attrName = attr.name;
            // 编译指令属性
            if (me.isDirective(attrName)) {

                var exp = attr.value; //表达式 或 事件回调函数名
                //v-on:click v-model v-text v-html
                var dir = attrName.substring(2); //指令 去掉 v-

                if (me.isEventDirective(dir)) { 
                    // 事件指令
                    // on:click
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                } else { 
                    // 普通指令
                    //dir  text model html
                    //  执行绑定
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理工具
var compileUtil = {
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    class: function (node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },
    //监听数据、绑定更新函数的处理是在compileUtil.bind()这个方法中，通过new Watcher()添加回调来接收数据变化的通知
    bind: function(node, vm, exp, dir) {
        //更新视图函数名称
        var updaterFn = updater[dir + 'Updater'];
        //执行 各种更新函数 用初始值初始化界面
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        // 绑定视图更新函数 --- 第三个回调参数
        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            // 事件类型存在且 有回调方法 绑定事件监听器 及回调方法（this 指向 vm）
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

// 各类视图更新函数
var updater = {
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};