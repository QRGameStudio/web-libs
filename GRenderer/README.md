## GRenderer

Is a minimalistic renderer created for use with this application. It's main goal is to help the developer with creating the web page by allowing him to write `if` and `for` statements right inside the HTML.

### GRenderer scopes

JS renderer has 4 main scopes that can be used inside HTML code:

- `v` is an alias for `renderer.variables`
- `f` is an alias for `renderer.functions`
- `w` for assigning values of inputs (functions `renderer.getValue` and `renderer.setValue`)
- `l` for local variables, created by for loops

### GRenderer attributes

- `r-if="condition"` - only if `eval(condition)` is true, this element will be shown
- `r-for="number of [1, 2, 3]"` - will create this element 3 times, with local variable `number` having values `1`, then `2` and then `3`
- `r-click="function(params)"` - will execute given function on click on this element
- `r-attr="{&quot;style&quot;: &quot;val&quot;}"` - will set the attribute `style` of this element to `eval(val)`

### GRenderer example

The code

```html
<h1 r-var="v.title"
    r-attr="{&quot;style&quot;: &quot;'color: ' + v.titleColor + ';'&quot;}">
</h1>
<ul>
    <li r-for="name of v.names">
        <span>Hello, <span r-var="l.name" r-click="f.myClick(l.name)"></span>!</span>
    </li>
</ul>
<input type=text r-val="w.myInput">
<button r-click="f.printValue()">Print value</button>
<p r-if="v.p1">
    This will be shown
</p>
<p r-if="v.p2">
    This will be hidden
</p>
```

```javascript
const renderer = new Renderer();
renderer.variables.title = "Big title";
renderer.variables.titleColor = "green";
renderer.variables.names = ["Joe", "Bill", "Alice"];
renderer.variables.p1 = true;
renderer.variables.p2 = false;
renderer.functions.myClick = (name) => {alert(`I welcome you, ${name}`)};
renderer.functions.printValue = () => {alert(renderer.getValue('myInput'))};
renderer.render();
```

will produce

```html
<h1 style="color: green;">Big title</h1>
<ul>When you click on
    <li><span>Hello, <span>Joe</span>!</span></li>
    <li><span>Hello, <span>Bill</span>!</span></li>
    <li><span>Hello, <span>Alice</span>!</span></li>
</ul>
<input type=text>
<button>Print value</button>
<p>
    This will be shown
</p>
```

- after clicking on any name, the alert `I welcome you, ${name}` will appear
- after clicking on `Print value` button, an alert with the content same as the value of the input will appear
