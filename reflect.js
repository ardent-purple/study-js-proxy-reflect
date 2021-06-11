/*
Reflect -- это особый встроенный объект в JS, который позволяет нам получить доступ к низкоуровневым функциям, обращаясь к методам данного объекта
Его методы как бы "отражают" операцию на объект
Де факто это равнозначно:
const _ = obj[prop] <=> Reflect.get(obj, prop)
obj[prop] = val <=> Reflect.set(obj, prop, val)
delete obj[prop] <=> Reflect.deleteProperty(obj, prop)
const _ = new Obj(a1, a2, a3) <=> Reflect.construct(Obj, args)

И другие методы, прямо как ловушки в Proxy! Даже сигнатуры те же!
Зачем это надо? Для того, чтобы в Proxy прозрачно перенаправлять вызовы на оригинальный обернутый объект без искажений
*/

// Это очень пригождается, когда мы сталкиваемся с прототипным наследованием
const user = {
  _firstname: 'Max',
  _lastname: 'Max',
  get fullname() {
    return `${this._firstname} ${this._lastname}`
  }
}
const userProxy = new Proxy(user, {
  get(target, prop, receiver) {
    return target[prop] // target = user (!!!)
  }
})

const admin = {
  __proto__: userProxy, // при использовании прототипа, все несуществующие свойства, в т.ч. и геттеры, будут искаться в протопипе
  _firstname: 'Tom',
  _lastname: "Tom"
}

console.log(admin.fullname) 
// (1) 'Max Max' ?! semantic Error! fullname -- это свойство user, его будут искать в прототипе, то есть в прокси, а в нём берется get от target (target[prop]), как следствие, геттер работает неправильно

// В такой ситуации мог бы сработать call|apply, но это же геттер, как мы собираемся его вызывать?!
// тут нам помогают Reflect и receiver. Первый дает нам метод get, а второй грамотно указывает на текущий контекст выполнения, то есть унаследовавший проксированную функциональность объект:

const user2 = {
  _firstname: 'Max',
  _lastname: 'Max',
  get fullname() {
    return `${this._firstname} ${this._lastname}`
  }
}
const userProxy2 = new Proxy(user, {
  get(target, prop, receiver) {
    // return Reflect.get(target, prop, receiver)
    return Reflect.get(...arguments) // специально так было в спеке придумано
  }
})

const admin2 = {
  __proto__: userProxy2, // при использовании прототипа, все несуществующие свойства, в т.ч. и геттеры, будут искаться в протопипе
  _firstname: 'Tom',
  _lastname: "Tom"
}

console.log(admin2.fullname) // (2) 'Tom Tom' все верно!

/*
Ограничения прокси:
 - Прокси -- это не тот же самый объект! Строго сравнение, а также использование в качестве ключей надо проводить с осторожностью.
 - Внутренние методы -- прокси не может дать доступ ко внутренним методам определенных объектов, типа Map, Set, Date. Тогда нужно биндить напрямую в ловушках прокси
 - Приватные поля классов. Тоже получаются без внутренних [[get]]|[[set]], а без них проксировать не получится. Опять же, решается привязкой контекста.

*/

/*
Отключение прокси
*/
const { proxy, revoke: revokeProxy } = Proxy.revocable({
  a: 2,
  b: 4
}, {
  get(target, prop, receiver) {
    const val = Reflect.get(...arguments)
    console.log(`${prop} was asked with data ${val}`);
    return val
  }
})

console.log(proxy.a);
console.log(proxy.b)
revokeProxy()
// console.log(proxy.a); // TypeError: Cannot perform 'get' on a proxy that has been revoked