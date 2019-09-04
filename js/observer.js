function Observer(data) {
    this.data = data;
    this.walk(data);
}
// 属性劫持观察者
Observer.prototype = {
    constructor: Observer,
    walk: function(data) {
        var me = this;
        Object.keys(data).forEach(function(key) {
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },

    defineReactive: function(data, key, val) {
        var dep = new Dep();
        var childObj = observe(val);

        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                if (Dep.target) {
                    //添加订阅
                    dep.depend();
                }
                return val;
            },
            set: function(newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知 订阅者
                dep.notify();
            }
        });
    }
};
// 实例化函数 属性劫持器 进行观察 data属性
function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }

    return new Observer(value);
};

var uid = 0;
function Dep() {
    this.id = uid++;
    this.subs = [];    //watcher 数组
}
// 属性订阅器addSub 通知器 notify
Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        Dep.target.addDep(this);  //watcher 里 添加 dep
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null;