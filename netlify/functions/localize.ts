import { handleLocalization } from '../../server/localization';
export default (request: Request) => handleLocalization(request, process.env);
export const config = { path: '/api/localize' };
