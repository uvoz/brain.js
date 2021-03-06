/**
 * @param {Matrix} product
 * @param {Matrix} left
 */
export default function sigmoid(product, left) {
  // sigmoid nonlinearity
  for(let i=0, max = left.weights.length; i < max; i++) {
    product.weights[i] = 1 / ( 1 + Math.exp(-left.weights[i]));
  }
}


function sig(x) {
  // helper function for computing sigmoid
  return 1 / (1 + Math.exp(-x));
}