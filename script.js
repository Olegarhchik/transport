"use strict";

class Task {
  matrix = new Map();
  providers = new Array();
  clients = new Array();

  constructor(providers, clients, prices) {
    this.providers = providers;
    this.clients = clients;
    this.matrix.prices = prices;
  }

  static getData() {
    let table = document.querySelector('.table__input table');

    let providers = [];
    let clients = [];

    let rows = table.querySelectorAll('tr:not(.table__head)');

    rows.forEach((tr, i) => {
        let cells = tr.childNodes;

        cells.forEach((td, j) => {
          let input = td.querySelector('input');

          if (i == 0) {
              clients.push(+input.value);
          }

          if (j == 0 && i != 0) {
              providers.push(+input.value);
          }
        });
    });

    if (providers.concat(clients).includes(0)) {
      alert('Заполните таблицу');
      return 0;
    }

    let prices = [];
    rows.forEach((tr, i) => {
      let values = [];
      let cells = tr.childNodes;

      cells.forEach((td, j) => {
        let input = td.querySelector('input');

        td.innerHTML = input.value;
        input.remove();

        if (i == 0 || j == 0) return;
        else values.push(+td.innerText);
      })

      if (i != 0)
        prices.push(values);
    })

    if (prices.some((row) => row.includes(0))) {
      alert('Заполните таблицу');
      return 0;
    }

    document.querySelector('input[name="provider"]').setAttribute('readonly', 'true');
    document.querySelector('input[name="client"]').setAttribute('readonly', 'true');

    return new this(providers, clients, prices);
  }
}

class Algorithm extends Task {
  nodes = new Map();
  u = new Array();
  v = new Array();

  constructor(providers, clients, prices) {
    super(providers, clients, prices)
    this.m = providers.length;
    this.n = clients.length;
  }

  // проверка на замкнутость модели
  modelIsOpened() {
    return this.providers.sum() != this.clients.sum();
  }

  // закрытие модели
  modelClose() {
    let prices = this.matrix.prices;
    let delta = this.providers.sum() - this.clients.sum();

    if (delta > 0) {
      this.clients.push(delta);
      this.n += 1;
      prices.forEach(
        (row, i) => prices[i].push(0)
      );
    } else {
      this.providers.push(-delta);
      this.m += 1;
      prices.push(new Array(this.clients.length).fill(0));
    }

    this.matrix.prices = prices;
  }

  // расчет потенциалов
  calcPotentials() {
    let plan = this.matrix.plan;
    let prices = this.matrix.prices;
    let u = new Array(this.m), v = new Array(this.n);

    u[0] = 0;

    while (u.concat(v).includes(undefined)) {
      for (let i = 0; i < this.m; i++) {
        for (let j = 0; j < this.n; j++) {
          if (plan[i][j] == null)
            continue;

          if (u[i] == undefined && v[j] != undefined)
            u[i] = prices[i][j] - v[j];

          if (v[j] == undefined && u[i] != undefined)
            v[j] = prices[i][j] - u[i];
        }
      }
    }

    [this.u, this.v] = [u, v];
  }

  // расчет оценок
  calcDelta() {
    let prices = this.matrix.prices;
    let delta = new Array(this.m);
    let [u, v] = [this.u, this.v];

    for (let i = 0; i < this.m; i++)
      delta[i] = new Array(this.n);

    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        delta[i][j] = prices[i][j] - u[i] - v[j];
      }
    }

    this.matrix.delta = delta;
  }

  // перераспределение товара по циклу
  redirectProduct() {
    let nodes = this.nodes.index;
    let plan = this.matrix.plan;
    let prices = this.matrix.prices;
    let prod = new Array(nodes.length).fill(1);

    for (let i = 1; i < prod.length; i += 2)
      prod[i] *= -1;

    let [r, s] = nodes[1];

    for (let i = 3; i < prod.length; i += 2) {
      let [curr_i, curr_j] = nodes[i];

      if (plan[curr_i][curr_j] < plan[r][s]) {
        r = curr_i;
        s = curr_j;
      }

      if (plan[curr_i][curr_j] == plan[r][s] && prices[curr_i][curr_j] > prices[r][s]) {
        r = curr_i;
        s = curr_j;
      }
    }

    let x = plan[r][s];

    prod.forEach((elem, i) => prod[i] *= x);

    this.nodes.value = prod;

    return [r, s];
  }

  // получение опорного плана методом северо-западного угла
  initPlan() {
    let i = 0, j = 0;

    let plan = new Array(this.m);

    for (let i = 0; i < this.m; i++)
      plan[i] = new Array(this.n).fill(null);

    while (i + j != this.m + this.n - 1) {
      let providersLeft = this.providers[i] - plan[i].sum();
      let clientsLeft = this.clients[j] - plan.map((row) => row[j]).sum();

      if (providersLeft > clientsLeft) {
        plan[i][j] += clientsLeft;
        j++;
      } else {
        plan[i][j] += providersLeft;
        i++;
      }
    }

    this.matrix.plan = plan;
  }

  // улучшение плана
  updatePlan() {
    let [r, s] = this.redirectProduct();
    let nodes = this.nodes.index;
    let values = this.nodes.value;

    for (let i = 0; i < nodes.length; i++) {
      let [curr_i, curr_j] = nodes[i];

      this.matrix.plan[curr_i][curr_j] += values[i];
    }

    this.matrix.plan[r][s] = null;
  }

  // проверка плана на оптимальность
  planIsOptimal() {
    return (!this.matrix.delta.some((row) =>
      row.filter((elem) => elem < 0).length != 0)
    );
  }

  // нахождение первой вершины цикла
  findNode() {
    let prices = this.matrix.prices;
    let delta = this.matrix.delta;
    let k = 0, l = 0;

    for (let i = 0, min = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        if (delta[i][j] < min) {
          min = delta[i][j];
          k = i; l = j;
        }

        if (delta[i][j] == min && prices[i][j] < prices[k][l]) {
          k = i; l = j;
        }
      }
    }

    this.matrix.plan[k][l] = 0;

    return [k, l];
  }

  // создание цикла
  createCycle(nodes = [this.findNode()], target = "row", center = 0) {
    if (nodes.at(0).some((elem, i) => elem != nodes.at(-1)[i]) || nodes.length == 1) {
      let [last_i, last_j] = nodes.at(-1);

      if (target == "row") {
        let row = this.matrix.plan[last_i];

        for (let j = center; j < this.n; j++) {
          if (j == last_j) continue;

          if (row[j] != null) {
            nodes.push([last_i, j]);
            return this.createCycle(nodes, "col");
          }
        }

        nodes.pop();
        return this.createCycle(nodes, "col", last_i + 1);
      } else {
        let col = this.matrix.plan.map((row) => row[last_j]);

        for (let i = center; i < this.m; i++) {
          if (i == last_i) continue;

          if (col[i] != null) {
            nodes.push([i, last_j]);
            return this.createCycle(nodes, "row");
          }
        }

        nodes.pop();
        return this.createCycle(nodes, "row", last_j + 1);
      }
    }

    nodes.pop();
    this.nodes.index = nodes;
  }

  // текущая стоимость
  sumPrices() {
    let plan = this.matrix.plan;
    let prices = this.matrix.prices;

    let f = 0;

    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        f += plan[i][j] * prices[i][j];
      }
    }

    return f;
  }
}

class Solution extends Algorithm {
  constructor(providers, clients, prices) {
    super(providers, clients, prices)
    this.m = providers.length;
    this.n = clients.length;
  }

  numberBlock(div) {
    let n;

    if (div == document.querySelector('.solution div:first-child'))
      n = 1;
    else {
      let prev = div.previousSibling;
      let text = prev.querySelector('b').innerText;

      n = +text.split(' ')[1] + 1;
    }

    let b = document.createElement('b');

    b.classList.add('step');
    b.innerHTML = `Шаг ${n}`;

    div.prepend(b);
  }

  getCoords(center, cells) {
    let coords = [];

    let centerBox = center.getBoundingClientRect();
    let centerX = centerBox.left;
    let centerY = centerBox.top;

    cells.forEach((td) => {
      let currentBox = td.getBoundingClientRect();
      let currentX = currentBox.left + currentBox.width / 2;
      let currentY = currentBox.top + currentBox.height / 2;

      coords.push([currentX - centerX, currentY - centerY]);
    })

    return coords;
  }

  drawCycle(cells) {
    let div = document.querySelector('.carouselle:last-child .iteration').lastChild;
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    canvas.width = div.offsetWidth;
    canvas.height = div.offsetHeight;

    div.append(canvas);

    let coords = this.getCoords(canvas, cells);

    coords.forEach(([x, y], i) => {

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#ff0';
      ctx.fill();

      let [nextX, nextY] = (i != coords.length - 1) ? coords[i + 1] : coords[0];

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = '3';
      ctx.lineTo(nextX, nextY);
      ctx.stroke();
    })
  }

  getCells(table) {
    let vertex = new Array(this.nodes.index.length);
    let rows = table.childNodes;

    rows.forEach((tr, i) => {
      if (i <= 1 || i == this.m + 2) return;

      let cells = tr.childNodes;

      cells.forEach((td, j) => {
        if (j == 0 || j == this.n + 1) return;

        let nodes = this.nodes.index;
        let [x, y] = [i - 2, j - 1];

        nodes.forEach((node, i) => {
          if (node.every((t, i) => t == [x, y][i])) {
            vertex[i] = td;
          }
        })
      })
    })

    return vertex;
  }

  fillTable(table, obj) {
    let rows = table.childNodes;

    let prices = this.matrix.prices;
    let plan = this.matrix.plan;
    let delta = this.matrix.delta;
    let [u, v] = [this.u, this.v];

    if (obj.num <= 3) {
      rows.forEach((tr, i) => {
        let cells = tr.childNodes;

        if (i == 0 || i >= this.m + 2) return;

        if (i == 1) {
          cells.forEach((td, j) => {
            td.innerHTML = this.clients[j];
          })

          return;
        }

        cells.forEach((td, j) => {
          if (j == 0)
            td.innerHTML = this.providers[i - 2];

          if (j == 0 || j >= this.n + 1)
            return;

          let table = document.createElement('table');
          let classes = [
            ['delta', 'price'],
            ['fill', 'change']
          ];
          table.classList.add('table__inner');

          for (let i = 0; i < 2; i++) {
            let tr = document.createElement('tr');

            for (let j = 0; j < 2; j++) {
              let td = document.createElement('td');
              td.classList.add(classes[i][j]);

              tr.append(td);
            }

            table.append(tr);
          }

          td.append(table);
          td.querySelector('.price').innerHTML = prices[i - 2][j - 1];
        })
      })
    }

    if (obj.type == 'plan' || obj.type == 'potential') {
      rows.forEach((tr, i) => {
        if (i <= 1 || i >= this.m + 2) return;

        let cells = tr.childNodes;

        cells.forEach((td, j) => {
          if (j == 0 || j >= this.n + 1) return;

          td.querySelector('.fill').innerHTML = plan[i - 2][j - 1];
        })
      })

      if (obj.type == 'potential') {
        rows.forEach((tr, i) => {
          let cells = tr.childNodes;

          if (i <= 1) return;

          if (i == this.m + 2) {
            tr.lastChild.innerHTML = '–';

            cells.forEach((td, j) => {
              if (j == 0 || j == this.n + 1) return;

              td.innerHTML = v[j - 1];
            })
          } else
            tr.lastChild.innerHTML = u[i - 2];
        })
      }
    }

    if (obj.type == 'delta') {
      let [k, l] = this.findNode();

      rows.forEach((tr, i) => {
        if (i <= 1 || i >= this.m + 2) return;

        let cells = tr.childNodes;

        cells.forEach((td, j) => {
          if (j == 0 || j >= this.n + 1) return;

          let d = delta[i - 2][j - 1];

          if (d < 0) {
            td.querySelector('.delta').innerHTML = d;

            if (d == delta[k][l])
              td.querySelector('.delta').classList.add('highlight');
          }
        })
      })
    }

    if (obj.type == 'cycle' || obj.type == 'change') {
      let vertex = this.getCells(table);

      this.drawCycle(vertex);

      if (obj.type == 'change') {
        let value = this.nodes.value;
        let sign = ['+', '-'];

        vertex.forEach((td, i) => {
          td.querySelector('.change').innerHTML = sign[i % 2] + Math.abs(value[i]);
          td.querySelector('.change').classList.add('highlight');
        })
      }

      rows.forEach((tr, i) => {
        if (i <= 1 || i >= this.m + 2) return;

        let cells = tr.childNodes;
        let [r, s] = this.redirectProduct();

        cells.forEach((td, j) => {
          if (j == 0 || j >= this.n + 1) return;

          if (i - 2 == r && j - 1 == s) {
            if (obj.type == 'cycle')
              td.querySelector('.fill').classList.add('highlight');
            else
              td.querySelector('.fill').classList.remove('highlight');
          }

          td.querySelector('.delta').classList.remove('highlight');
        })
      })
    }
  }

  generateBlock(obj) {
    let solution = document.querySelector('.solution');
    let carouselle = document.querySelector('.carouselle:last-child');
    let iteration = document.querySelector('.carouselle:last-child .iteration');

    let div = document.createElement('div');
    div.classList.add(obj.type);

    if (obj.last) {
      iteration = document.createElement('div');
      iteration.classList.add('answer');
      document.querySelector('.container').append(iteration);
    }

    let subtitle = document.createElement('h2');
    subtitle.classList.add('subtitle');
    subtitle.innerHTML = obj.subtitle;
    div.append(subtitle);

    let table = obj.drawTable;
    if (obj.expanded)
      table.classList.add('expanded');
    div.append(table);

    if (obj.first || obj.last) {
      let p = document.createElement('p');
      p.classList.add('description');
      p.innerHTML = `Стоимость перевозки F = ${this.sumPrices()}`;
      div.append(p);
    }

    if ((obj.type == 'model' || obj.type == 'plan') && !obj.last) {
      iteration = document.createElement('div');
      iteration.classList.add('iteration');
      carouselle = document.createElement('div');
      carouselle.classList.add('carouselle');

      if (obj.type == 'plan') {
        this.addArrow(carouselle, 'left');
        this.addArrow(carouselle, 'right');
      }

      carouselle.append(iteration);
      solution.append(carouselle);
      this.numberBlock(carouselle);
    }

    iteration.append(div);
    this.fillTable(table, obj);
  }

  createTable(type, f = false, l = false) {
    let list = ['model', 'plan', 'potential', 'delta', 'cycle', 'change'];
    let subtitles = ['Закрытие модели', 'Улучшенный план', 'Рассчет потенциалов', 'Проверка на оптимальность', 'Построение цикла', 'Перераспределение товара'];

    function Table(type, f, l) {
      this.type = type;
      this.expanded = false;
      this.first = f;
      this.last = l;

      for (let i = 0; i < list.length; i++) {
        if (type == list[i]) {
          this.num = i + 1;
          break;
        }
      }

      this.subtitle = subtitles[this.num - 1];

      if (this.num == 2) {
        if (f) this.subtitle = 'Изначальный план';
        if (l) this.subtitle = 'Оптимальный план';
      }

      if (this.num >= 3) {
        this.expanded = true;
      }
    }

    let table = new Table(type, f, l);

    table.drawTable = generateTable(this.m, this.n, table.expanded);

    if (table.num >= 4)
      table.drawTable = document.querySelector('.carouselle:last-child .iteration').lastChild.querySelector('table').cloneNode(true);

    return table;
  }

  addArrow(div, direction) {
    let arrow = document.createElement('span');
    arrow.classList.add('arrow');
    arrow.classList.add(direction);

    let img = document.createElement('img');
    img.setAttribute('src', 'img/arrow.svg');
    arrow.append(img);

    div.prepend(arrow);

    arrow.addEventListener('click', () => {
      let iteration = arrow.parentElement.lastChild;
      let width = iteration.offsetWidth;

      iteration.scrollLeft += (direction == 'left') ? -width : width;
    })
  }
}

Array.prototype.sum = function() {
  return this.reduce((a, b) => a + b);
}

let solveButton = document.querySelector('.solve');

solveButton.addEventListener('click', () => {
  let solution = Solution.getData();

  if (solution == 0) return;

  document.querySelector('.solution').classList.remove('hidden');

  if (solution.modelIsOpened()) {
    solution.modelClose();

    let table = solution.createTable('model');
    solution.generateBlock(table);
  }

  do {
    let table, f = false;

    if (solution.matrix.plan == undefined) {
      solution.initPlan();
      f = true;
    } else {
      solution.updatePlan();

      table = solution.createTable('change');
      solution.generateBlock(table);
    }

    solution.calcPotentials();
    solution.calcDelta();

    table = solution.createTable('plan', f);

    solution.generateBlock(table);

    table = solution.createTable('potential');
    solution.generateBlock(table);

    if (solution.planIsOptimal()) {
      table = solution.createTable('plan', f, true);
      solution.generateBlock(table);

      break;
    }

    table = solution.createTable('delta');
    solution.generateBlock(table);

    solution.createCycle();

    table = solution.createTable('cycle');
    solution.generateBlock(table);
  } while(true);
})

let inputTable = document.querySelector('.table__input');
let tableSize = document.querySelector('.table__size');
let resetButton = document.querySelector('button[type="reset"]');
let arrowButtons = document.querySelector('.arrow');

// Валидация ввода

function inputIsCorrect(min = 1, max = 0) {
  let input = document.activeElement;

  if (input.value == "")
    return false;

  if (+input.value < min) {
    input.value = "";
    alert('Введите положительное значение');
    return false;
  }

  if (max != 0 && +input.value > max) {
    input.value = "";
    alert('Введите меньшее значение');
    return false;
  }

  return true;
}

// Генерация таблиц

function generateTable(m, n, expanded = false) {
  let table = document.createElement('table');

  if (expanded) {
    m++; n++;
  }

  for (let i = 0; i < m + 2; i++) {
    let tr = document.createElement('tr');

    if (i == 0) {
      tr.classList.add('table__head');

      table.append(tr);

      let th = document.createElement('th');
      th.classList.add('table__provider');
      th.setAttribute('rowspan', '2');
      th.innerHTML = 'Поставщики';

      tr.append(th);

      th = document.createElement('th');
      th.classList.add('table__client');
      if (expanded) th.setAttribute('colspan', n - 1);
      else th.setAttribute('colspan', n);
      th.innerHTML = 'Потребители';

      tr.append(th);

      if (expanded) {
        th = document.createElement('th');
        th.classList.add('table__potential');
        th.setAttribute('rowspan', '2');
        th.innerHTML = 'Потенциал';

        tr.append(th);
      }

      continue;
    }

    table.append(tr);

    for (let j = 0; j < n + 1; j++) {
      let td = document.createElement('td');

      if (j == 0 || i == 1)
        td = document.createElement('th');

      tr.append(td);
    }

    if (i == 1) {
      tr.classList.add('table__client');
      tr.firstChild.remove();

      if (expanded)
        tr.lastChild.remove();

      continue;
    }

    if (!expanded || i != m + 1)
      tr.firstChild.classList.add('table__provider');
    else {
      tr.classList.add('table__potential');
      tr.firstChild.innerHTML = 'Потенциал';
    }

    if (expanded && i != m + 1)
      tr.lastChild.classList.add('table__potential');
  }

  return table;
}

function generateInput(m = 4, n = 5) {
  let table = generateTable(m, n);
  let rows = table.childNodes;

  for (let i = 1; i < m + 2; i++) {
    let tr = rows[i];
    let td = tr.childNodes;

    for (let j = 0; j < n + 1; j++) {
      if (i == 1 && j == n)
        break;

      let input = document.createElement('input');

      input.setAttribute('type', 'number');
      td[j].append(input);
    }
  }

  inputTable.append(table);
  inputTable = table;
  table.addEventListener('input', () => inputIsCorrect());
}

generateInput();

tableSize.addEventListener('input', () => {
  if (!inputIsCorrect(1, 10))
    return;

  let [m, n] = tableSize.querySelectorAll('input');
  [m, n] = [+m.value, +n.value];

  inputTable.remove();

  inputTable = document.querySelector('.table__input');

  generateInput(m ,n);
})

// Очистка таблицы

resetButton.addEventListener('click', () => {
  if (!document.querySelector('.solution').classList.contains('hidden')) {
    if (confirm('Вы уверены?'))
      window.location.reload();
  } else {
    inputTable.remove();

    inputTable = document.querySelector('.table__input');

    generateInput();
  }
})