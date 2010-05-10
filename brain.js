
NeuralNetwork = function(options) {
  this.learningRate = 0.5;
  this.growthRate = 0.4;

  this.setOptions(options);

  if(this.json)
    this.fromJSON(this.json);
  else
    this.createLayers(this.hiddenLayers);
}

NeuralNetwork.prototype = {

  setOptions : function(options) {
    if(options) {
      for(option in options)
        this[option] = options[option];
    }
  },

  createLayers : function(hidden) {
    this.layers = [];

    var nlayers = hidden ? hidden.length + 2 : 3;
    var prevLayer;
    for(var i = 0; i < nlayers; i++) {
      var nnodes = hidden ? hidden[i - 1] : 0;
      var layer = new Layer(this, prevLayer, nnodes);
      this.layers.push(layer);
      prevLayer = layer;
    }

    this.inputLayer = this.layers[0];
    this.outputLayer = this.layers[nlayers - 1];
    if(!hidden)
      this.hiddenLayer = this.layers[1];
  },

  run : function(inputs) {
    this.inputLayer.createNodes(inputs);
    if(this.hiddenLayer)
      this.hiddenLayer.growLayer(this.inputLayer.size);

    this.inputLayer.outputs = inputs;

    for(var i = 1; i < this.layers.length; i++)
      this.layers[i].calcOutputs();

    var outputs = this.outputLayer.outputs;
    return this.formatOutput(outputs);
  },

  formatOutput : function(outputs) {
    var values = [];
    for(var id in outputs) {
      if(parseInt(id) != id) // not an array
        return outputs;
      values.push(outputs[id]);
    }
    return values;
  },

  trainItem : function(inputs, targets) {
    this.outputLayer.createNodes(targets);

    this.run(inputs);

    this.outputLayer.calcErrors(targets);
    for(var i = this.layers.length - 2; i >= 0; i--)
      this.layers[i].calcErrors();

    for(var i = 1; i < this.layers.length; i++)
      this.layers[i].adjustWeights();
  },

  train: function(data, iterations) {
    if(!iterations)
      iterations = 20000;
    for(var i = 0; i < iterations; i++) {
      for(var j = 0; j < data.length; j++)
        this.trainItem(data[j].input, data[j].target);
    }
  },

  toJSON : function() {
    var json = {layers: []};
    for(var i = 0; i < this.layers.length; i++)
      json.layers.push(this.layers[i].toJSON());
    return json;
  },

  fromJSON : function(json) {
    this.layers = [];
    var prevLayer;
    for(var i in json.layers) {
      var layer = new Layer(this, prevLayer, 0, json.layers[i]);
      this.layers.push(layer);
      prevLayer = layer; 
    }

    this.inputLayer = this.layers[0];
    this.outputLayer = this.layers[this.layers.length - 1];
  },

  toString : function() {
    return JSON.stringify(this.toJSON());
  }
}

function Layer(network, prevLayer, numNodes, json) {
  this.network = network;
  this.prevLayer = prevLayer;
  if(this.prevLayer) 
    this.prevLayer.nextLayer = this;

  this.nodes = {};
  if(json) {
    this.fromJSON(json);
  }
  else if(numNodes) {
    for(var i = 0; i < numNodes; i++)
      this.createNode(i);
  }
}

Layer.prototype = {
  get outputs() {
    return this.map(function(node) { return node.output; });
  },

  set outputs(outputs) {
    this.map(function(node, id) { node.output = outputs[id] || 0; });
  },

  get size() {
    var n = 0;
    for(var id in this.nodes)
      n++;
    return n;
  },

  map : function(callback) {
    var values = {};
    for(var id in this.nodes)
      values[id] = callback(this.nodes[id], id);
    return values;
  },

  growLayer : function(inputSize) {
    var targetSize = Math.max(2, inputSize * this.network.growthRate);
    var difference = targetSize - this.size;
    for(var i = this.size; i < targetSize; i++)
      this.createNode(i);
  },

  createNodes : function(ids) {
    for(var id in ids) {
      if(!this.nodes[id])
        this.createNode(id);
    }
  },

  createNode : function(id) {
    var node = new Node(this, id);
    this.nodes[id] = node;
    
    if(this.nextLayer) {
      var outgoing = this.nextLayer.nodes;
      for(var outid in outgoing)
        outgoing[outid].addIncoming(id);
    }
  },

  calcOutputs : function() {
    this.map(function(node) { node.calcOutput(); });
  },

  calcErrors : function(targets) {
    this.map(function(node) { node.calcError(targets); });
  },

  adjustWeights : function() {
    this.map(function(node) { node.adjustWeights(); });
  },

  toJSON : function() {
    var json = { nodes: []};
    for(var id in this.nodes)
      json.nodes[id] = this.nodes[id].toJSON();
    return json;
  },

  fromJSON : function(json) {
    this.nodes = {};
    for(var id in json.nodes)
      this.nodes[id] = new Node(this, id, json.nodes[id]);
  },
}

function Node(layer, id, json) {
  this.layer = layer;
  this.id = id;
  this.output = 0;

  var prev = this.layer.prevLayer;
  this.weights = {};
  if(json) {
    this.fromJSON(json);
  }
  else if(prev) {
    for(var id in prev.nodes)
      this.weights[id] = this.randomWeight();
    this.bias = this.randomWeight(); // instead of having a seperate bias node
  }
}

Node.prototype = {
  get inputs() { return this.layer.prevLayer.outputs; },
 
  get outgoing() { return this.layer.nextLayer.nodes; },

  randomWeight : function() {
    return Math.random() * 0.4  - 0.2;
  },

  sigmoid : function(num) {
    return 1/(1 + Math.exp(-num));
  },

  dsigmoid : function(num) {
    return num * (1 - num);
  },
 
  addIncoming : function(id) {
    this.weights[id] = this.randomWeight();
  },

  calcOutput : function() {
    var sum = this.bias;
    for(var id in this.weights)
      sum += this.weights[id] * this.inputs[id];
    this.output = this.sigmoid(sum);
  },

  calcError : function(targets) {
    var error;
    if(targets) {
      var expected = targets[this.id] || 0;
      error = (expected - this.output);
    }
    else {
      error = 0;
      for(var id in this.outgoing)
        error += this.outgoing[id].delta * this.outgoing[id].weights[this.id];
    }
    this.delta = error * this.dsigmoid(this.output);
  },

  adjustWeights : function() {
    var rate = this.layer.network.learningRate;
    for(var id in this.inputs)
      this.weights[id] += rate * this.delta * this.inputs[id];

    this.bias += rate * this.delta; 
  },

  toJSON : function() {
    return { weights: this.weights, bias: this.bias};
  },

  fromJSON : function(json) {
    this.weights = json.weights;
    this.bias = json.bias;
  },
}

exports.NeuralNetwork = NeuralNetwork;