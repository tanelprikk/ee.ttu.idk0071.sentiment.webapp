import { inject } from 'aurelia-framework';
import { Router } from 'aurelia-router';
import { DialogService } from 'aurelia-dialog';

import { DataAPI } from '../../gateways/data/data-api';
import { isEmpty } from '../../lib/utils';
import { blockPage, releasePage } from '../../app-utils';
import LookupSubmitted from './dialogs/lookup-submitted';
import ErrorDialog from '../dialogs/error-dialog';

import { formatSeconds } from '../../lib/time-utils';

import { EMAIL_REGEX } from '../../consts/validation-consts';
import { MSG_NETWORK_ERR, MSG_SUBMISSION_ERR } from '../../consts/messages';

@inject(DataAPI, Router, DialogService)
export class LookupForm {
  constructor(api, router, dialogService) {
    this.api = api;
    this.router = router;
    this.dialogService = dialogService;

    this.entityName = '';
    this.email = '';
    this.domainIds = [];
    this.regularSelectMode = true;
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

        this.averageDurationMinutesMap = {};
        domains.forEach(d => {
          Object.assign(this.averageDurationMinutesMap, { [d.code]: d.averageDurationMinutes});
        });
      })
      .catch((err) => {
        releasePage();
        this.openErrorDialog(MSG_NETWORK_ERR);
      });
  }

  get canLookup() {
    return !isEmpty(this.entityName)
      && this.isEmailValid
      && this.domainIds.length > 0;
  }

  get isEmailValid() {
    return isValidEmail(this.email);
  }

  performLookup() {
    blockPage();
    const { entityName, domainIds, email, durationString } = this;

    this.api.postLookup({ entityName, domainIds, email })
      .then(lookupResult => {
        releasePage();
        this.domainIds = [];
        this.entityName = '';
        this.email = '';
        this.durationString = null;
        this.openResultDialog({ lookupResult, entityName, durationString });
      })
      .catch(err => {
        releasePage();
        this.openErrorDialog(MSG_SUBMISSION_ERR);
      });
  }

  handleDomainSelectionChanged() {
    if (!this.domainIds.length) {
      this.durationString = null;
      return;
    }

    const estimatedDurationMinutes = this.domainIds
      .map(domainId => this.averageDurationMinutesMap[domainId])
      .reduce((prev, curr) => (Math.max(prev, curr)), null);
    if (!estimatedDurationMinutes) {
      this.durationString = 'unknown';
    } else {
      this.durationString = formatSeconds(estimatedDurationMinutes * 60);
    }
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

const isValidEmail = (email) => (isEmpty(email) || EMAIL_REGEX.test(email));
