/*
Прокси -- это особый вид объектов, не имеющий своих свойств, но оборачивающий объекты так, что способен перехватывать вызовы к ним и применять к ним свою кастомную логику на низком уровне.
Прокси может перехватить чтение, запись, проверку и удаление свойств, вызовы методов, вызовы new, установку и чтение прототипа, а также многое другое.

Основной вызов: 
const proxy = new Proxy(target, handle)
Где:
  - target -- целевой объект для проксирования
  - handle -- объект с "ловушками", именованные согласно протоколу для каждого отдельного перехвата. Если ловушки нет, то происходит как бы прямое обращение к объекту через прокси
*/ 

// get -- получение свойств из объекта
/*
вид: get(
  target, // проксированный объект
  prop, // свойство объекта для чтения
  receiver // или прокси, если простой вызов, или объект, который был унаследован от прокси по типу Object.create(proxy)
)
*/
// пример: будем возвращать из массива NaN при обращении к несуществующему индексу, вместо undefined

const arr = [ 1, 2, 3 ]
const proxy1 = new Proxy (arr, {
  get(target, prop) {
    if(prop in target) {
      return target[prop]
    } else {
      return NaN;
    }
  }
})

console.log(proxy1[0]);
console.log(proxy1[123]); // NaN
console.log(arr[123]); // undefined

// пример 2: будем возвращать ключ из словаря, чтобы не оставлять фразу пустой, если нет перевода
const dict = {
  'Hello': 'Hola',
  'Bye': 'Adios',
}
const proxy2 = new Proxy(dict, {
  get(target, prop) {
    if (prop in target) {
      return target[prop]
    } else {
      return prop
    }
  }
})
console.log(proxy2['Hello']); // Hola
console.log(proxy2['Cheese']) // Cheese
console.log(dict['Cheese']) // undefined

// !!! важно: желательно перезаписывать переменную объекта новым прокси, чтобы никто не мог ссылаться на старый объект напрямую. Тогда нужная логика будет обойдена и появятся семантические ошибки

// set -- установка свойства в объект
/*
вид:
set(
  target,
  prop,
  value, // value for the property to set
  receiver, // the object, the set to which was directed, either a proxy or an object, that inherits from this proxy
)
*/
// важный контракт -- ловушка должна вернуть true, если было присваивание, и false, если не было
// можно использовать для валидации

// пример 3. Делать массив исключительно для чисел
const arr2 = [ 1, 2, 3]
const proxy3 = new Proxy(arr2, {
  set(target, prop, val) {
    if (typeof val === 'number') {
      target[prop] = val 
      return true 
    } else {
      return false
    }
  }
})

proxy3[3] = 'a'
console.log(proxy3); // still 3 elements
proxy3[3] = 4
console.log(proxy3); // added!
// proxy3.push('a') // gets a "TypeError: 'set' on proxy: trap returned falsish for property '4'"

// ownKeys
// перехват внутреннего метода [[OwnPropertyKeys]]
// используется этот метод при:
//  - for ... in
//  - Object.getOwnPropertyNames
//  - Object.getOwnPropertySymbols
//  - Object.keys|values|entries

/*
вид:
ownKeys(target) // целевой объект
*/ 
// Нужно вернуть перебираемый объект ключей

// пример 4: пропускаем все свойства, начинающиеся с '_'
const proxy4 = new Proxy({
  _firstname: 'Max',
  _lastname: 'R',
  age: 25,
  _password: '****',
  get fullname() {
    return `${this._firstname} ${this._lastname}`
  }
}, {
  ownKeys(target) {
    return Object.keys(target).filter(prop => !prop.startsWith('_'))
  }
})

for (let key in proxy4) console.log(proxy4[key]);
console.log(Object.keys(proxy4))
console.log(Object.values(proxy4))
console.log(Object.entries(proxy4))
console.log(Object.getOwnPropertyNames(proxy4));

// несуществующие ключи возвратить не получится, потому что у них просто нет флага enumerable
const user = new Proxy({}, {
  ownKeys() { return [1, true, 'a']}
})
console.log(user.a); // undefined

// getOwnPropertyDescriptor
// получение свойства по дескриптору, например, несуществующего
/*
getOwnPropertyDescriptor(
  target,
  prop
)
// необходимо вернуть дескриптор свойства -- {
  writable: boolean,
  enumerable: boolean,
  configurable: boolean,
}
*/

// пример 5, запретить писать в свойство password
const proxy5 = new Proxy({
  user: 'max',
  password: '****'
}, {
  getOwnPropertyDescriptor(target, prop) {
    if (prop === 'password') {
      return {
        writable: false,
        enumerable: true,
        configurable: true
      }
    }
    return {
      writable: true,
      enumerable: true,
      configurable: true
    }
  }
})

proxy5['password'] = '|||||'
console.log(proxy5); // no change

// deleteProperty
// срабатывает на удалении свойства
// пример 6, запретить удалять свойства извне
const proxy6 = new Proxy({ a: 1, b: 2 }, {
  deleteProperty(target, prop) {
    return false
  }
})
console.log(proxy6);
proxy6.c = 3;
console.log(proxy6);
delete proxy6.a 
console.log(proxy6); // does not delete

// !!! важная заметка о функциях
// get срабатывает и тогда, когда мы пытаемся получить доступ к методам!
const proxyFunction = new Proxy({
  a: 1,
  printA() { console.log(this.a) }
}, {
  get(target, prop) {
    if (prop === 'a') throw Error('not allowed')
    console.log(`type of requested field: ${typeof target[prop]}`)
    return target[prop]
  }
})
// функция запрашивается от прокси
console.log(proxyFunction.printA)

// однако биндинг потеряется -- текущий this будет равен proxy и полезет за get
// proxyFunction.printA() // ошибка при доступе функции к полю -- всё потому что this === proxy, соответственно свой же метод не сможет получить доступ к приватным полям

// решение (применять аккуратно, потому что ссылки задваиваются, то на прокси, то на объект)
const proxyFunctionCorrect = new Proxy({
  b: 2, 
  printB() { console.log(this.b); }
}, {
  get(target, prop) {
    if (prop === 'b') throw Error('not allowed')
    const value = target[prop]
    return (typeof value === 'function') ? value.bind(target) : value
  }
})

proxyFunctionCorrect.printB()

// has
// ловушка, перехватывающая методы вида `prop in obj`
// пример 7 -- просмотр числа в диапазоне, есть ли?
const proxy7 = new Proxy({
  min: 1,
  max: 100
}, {
  has(target, prop) {
    return target.min <= prop && target.max >= prop
  }
})
console.log(5 in proxy7);
console.log(5000 in proxy7);
console.log(-1 in proxy7);

// apply
// обертка функций и вызываемых объектов в целом, всё, что callable
/*
вид:
apply(
  target,
  thisArg, // контекст this
  args, // список аргументов
)
*/
// на этой базе можно реализовывать декораторы
// они намного мощнее функциональных обёрток, т.к. не скрывает свойств функций-- имени и длины

// пример 8. проксирование delay
const delay = (fn, ms) => new Proxy(fn, {
  apply(target, thisArg, args) {
    setTimeout(() => target.apply(thisArg, args), ms)
  }
})

const sayHi = str => console.log(`hi ${str}`)
const sayHiDelay = delay(sayHi, 2000)
sayHiDelay('mama')

