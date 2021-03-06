import { inject } from 'aurelia-framework';
import { Router } from 'aurelia-router';
import { DataAPI } from '../../gateways/data/data-api';
import { DialogService } from 'aurelia-dialog';

import { blockPage, releasePage } from '../../app-utils';
import ErrorDialog from '../dialogs/error-dialog';

const STATE_COMPLETE = 'Complete';
const STATE_ERROR = 'Error';

@inject(DataAPI, Router, DialogService)
export class LookupDetail {
  constructor(api, router, dialogService) {
    this.api = api;
    this.router = router;
    this.dialogService = dialogService;

    this.completeDomainLookups = [];
    this.incompleteDomainLookups = [];
    this.registerDomainLookup = this.registerDomainLookup.bind(this);
  }

  activate(params) {
    const { lookupId } = params;
    this.isLoading = true;
    blockPage();
    this.api.fetchLookup(lookupId)
      .then(lookupData => {
        releasePage();
        this.isLoading = false;
        this.registerLookup(lookupData);
      })
      .catch((err) => {
        releasePage();
        this.isLoading = false;
        this.router.navigateToRoute('not-found');
      });
  }

  get hasIncompleteLookups() {
    return this.incompleteDomainLookups.length > 0;
  }

  get hasCompleteLookups() {
    return this.completeDomainLookups.length > 0;
  }

  registerLookup(lookupData) {
    this.lookupData = lookupData;
    lookupData.domainLookups.forEach(this.registerDomainLookup);
  }

  registerDomainLookup(domainLookup) {
    const { id, domainLookupState } = domainLookup;
    let currStateName = domainLookupState.name;

    if (isCompleteState(currStateName)) {
      this.registerCompleteDomainLookup(id);
      return;
    }

    this.incompleteDomainLookups.push(flattenDomainLookup((domainLookup)));

    const eventSource = this.api.getDomainLookupEventSource(id);
    eventSource.onerror = (error) => {
      // prevent error spam
      if (!this.eventSourceErrorOccurred) {
        this.eventSourceErrorOccurred = true;
        this.openErrorDialog('A network error has occurred. You might want to refresh the page.');
      }
    };

    eventSource.addEventListener('state', (event) => {
      currStateName = event.data;
      if (isCompleteState(currStateName)) {
        eventSource.close();
        this.registerCompleteDomainLookup(id);
      } else {
        this.incompleteDomainLookups.find(d => d.id === id)
          .currStateName = currStateName;
      }
    });
  }

  registerCompleteDomainLookup(id) {
    this.incompleteDomainLookups = this.incompleteDomainLookups
      .filter(d => d.id !== id);
    this.api.fetchDomainLookup(id)
      .then(cpltDomainLookup => {
        this.completeDomainLookups.unshift(
          extendCompleteDomainLookup(flattenDomainLookup(cpltDomainLookup))
        );
      });
  }

  openErrorDialog(message) {
    this.dialogService.open({
      viewModel: ErrorDialog,
      model: { message }
    });
  }
}

const isCompleteState = (stateName) => (
  stateName === STATE_COMPLETE || stateName === STATE_ERROR
);

const extendCompleteDomainLookup = (domainLookup) => {
  const chartDataItems = [
    {
      data: domainLookup.positiveCount,
      label: 'Positive',
      color: 'green'
    },
    {
      data: domainLookup.neutralCount,
      label: 'Neutral',
      color: 'yellow'
    },
    {
      data: domainLookup.negativeCount,
      label: 'Negative',
      color: 'red'
    }
  ];
  const totalCount = domainLookup.neutralCount
    + domainLookup.negativeCount
    + domainLookup.positiveCount;

  return Object.assign(domainLookup, { chartDataItems, totalCount });
};

const flattenDomainLookup = (domainLookup) => {
  const currStateName = domainLookup.domainLookupState.name;
  const domainName = domainLookup.domain.name;
  const isError = currStateName === STATE_ERROR;
  const isSuccess = currStateName === STATE_COMPLETE;

  return Object.assign({}, domainLookup, {
    isError,
    isSuccess,
    domainName,
    currStateName
  });
};

