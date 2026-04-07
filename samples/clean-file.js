// A normal, clean JavaScript file. No Glassworm indicators.
'use strict';

function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = arr.slice(1).filter(x => x <= pivot);
  const right = arr.slice(1).filter(x => x > pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}

console.log('Fibonacci(10):', fibonacci(10));
console.log('Sorted:', quickSort([3, 1, 4, 1, 5, 9, 2, 6]));
