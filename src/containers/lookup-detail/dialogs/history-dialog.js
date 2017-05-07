import { inject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';

@inject(DialogController)
export default class HistoryDialog {
  constructor(controller) {
    this.controller = controller;
  }

  activate({ graphData, title, subtitle, message }) {
    this.graphData = graphData;
    this.message = message;
    this.subtitle = subtitle;
    this.title = title;
  }

  close() {
    this.controller.cancel();
  }
}
