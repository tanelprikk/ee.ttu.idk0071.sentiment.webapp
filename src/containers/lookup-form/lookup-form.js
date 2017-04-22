import { inject } from 'aurelia-framework';
import { Router } from 'aurelia-router';
import { DialogService } from 'aurelia-dialog';

import { DataAPI } from '../../gateways/data/data-api';
import { isEmpty } from '../../lib/utils';
import { blockPage, releasePage } from '../../app-utils';
import LookupSubmitted from './dialogs/lookup-submitted';
import ErrorDialog from '../dialogs/error-dialog';

import { MSG_NETWORK_ERR, MSG_SUBMISSION_ERR } from '../../consts/messages';

@inject(DataAPI, Router, DialogService)
export class LookupForm {
  constructor(api, router, dialogService) {
    this.api = api;
    this.router = router;
    this.dialogService = dialogService;

    this.entityName = '';
    this.domainIds = [];
    this.regularSelectMode = false;
  }

  attached() {
    blockPage();
    this.api.fetchDomains()
      .then((domains) => {
        releasePage();
        this.domainOptions = domains.map(d => ({
          label: d.name,
          value: d.code
        }));
      })
      .catch((err) => {
        releasePage();
        this.openErrorDialog(MSG_NETWORK_ERR);
      });
  }

  get canLookup() {
    return !isEmpty(this.entityName)
      && this.domainIds.length > 0;
  }

  performLookup() {
    blockPage();
    const { entityName, domainIds } = this;

    this.api.postLookup({ entityName, domainIds })
      .then(lookupResult => {
        releasePage();
        this.domainIds = [];
        this.entityName = '';
        this.openResultDialog({ lookupResult, entityName });
      })
      .catch(err => {
        releasePage();
        this.openErrorDialog(MSG_SUBMISSION_ERR);
      });
  }

  openResultDialog(model) {
    this.dialogService.open({
      viewModel: LookupSubmitted,
      model: model
    });
  }

  openErrorDialog(message) {
    this.dialogService.open({
      viewModel: ErrorDialog,
      model: { message }
    });
  }
}
