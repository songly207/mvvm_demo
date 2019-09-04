function MVVM(options) {
    this.$options = options || {};
    var data = this._data = this.$options.data;
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    //主要还是利用了Object.defineProperty()这个方法来劫持了vm实例对象的属性的读写权，使读写vm实例的属性转成读写了vm._data的属性值，达到鱼目混珠的效果
    Object.keys(data).forEach(function(key) {
        me._proxyData(key);
    });

    // 初始化计算属性
    this._initComputed();

    // 劫持 data数据 观察属性 能够对数据对象的所有属性进行监听，如有变动可拿到最新值并通知订阅者
    observe(data, this);

    //编译模板 遍历所有节点及其子节点，进行扫描解析编译，调用对应的指令渲染函数进行数据渲染，并调用对应的指令更新函数进行绑定
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    constructor: MVVM,
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxyData: function(key, setter, getter) {
        var me = this;
        // setter = setter || 
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: typeof computed[key] === 'function' 
                            ? function() {}
                            : computed[key].set
                });
            });
        }
    }
};