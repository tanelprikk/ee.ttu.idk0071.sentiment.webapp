export function configure(config) {
  config.globalResources([
    './value-converters/filter-by',
    './value-converters/filter-exact',
    './value-converters/order-by',
    './elements/graphs/pie-chart',
    './elements/graphs/line-chart',
    './elements/form-elements/drag-drop-select',
    './elements/utility-elements/countdown-timer',
    './attributes/key-return'
  ]);
}
