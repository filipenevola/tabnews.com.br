import nextConnect from 'next-connect';
import controller from 'models/controller.js';
import authentication from 'models/authentication.js';
import authorization from 'models/authorization.js';
import recovery from 'models/recovery.js';
import validator from 'models/validator.js';

export default nextConnect({
  attachParams: true,
  onNoMatch: controller.onNoMatchHandler,
  onError: controller.onErrorHandler,
})
  .use(controller.injectRequestId)
  .use(authentication.injectAnonymousOrUser)
  .use(controller.logRequest)
  .post(postValidationHandler, authorization.canRequest('create:recovery_token'), postHandler)
  .patch(patchValidationHandler, authorization.canRequest('update:recovery_token'), patchHandler);

function postValidationHandler(request, response, next) {
  const cleanValues = validator(request.body, {
    username: 'optional',
    email: 'optional',
  });

  request.body = cleanValues;

  next();
}

async function postHandler(request, response) {
  const userTryingToRecover = request.context.user;
  const insecureInputValues = request.body;

  const secureInputValues = authorization.filterInput(
    userTryingToRecover,
    'create:recovery_token',
    insecureInputValues
  );

  const tokenObject = await recovery.createAndSendRecoveryEmail(secureInputValues);

  const authorizedValuesToReturn = authorization.filterOutput(userTryingToRecover, 'read:recovery_token', tokenObject);

  return response.status(201).json(authorizedValuesToReturn);
}

function patchValidationHandler(request, response, next) {
  const cleanValues = validator(request.body, {
    token_id: 'required',
    password: 'required',
  });

  request.body = cleanValues;

  next();
}

async function patchHandler(request, response) {
  const userTryingToRecover = request.context.user;
  const insecureInputValues = request.body;

  const secureInputValues = authorization.filterInput(
    userTryingToRecover,
    'update:recovery_token',
    insecureInputValues
  );

  const tokenObject = await recovery.resetUserPassword(secureInputValues);

  const authorizedValuesToReturn = authorization.filterOutput(userTryingToRecover, 'read:recovery_token', tokenObject);

  return response.status(200).json(authorizedValuesToReturn);
}
