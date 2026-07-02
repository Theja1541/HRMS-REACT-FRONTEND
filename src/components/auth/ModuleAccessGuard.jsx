import { Navigate } from 'react-router-dom';
import { hasModuleAccess } from '../../utils/moduleAccess';

export default function ModuleAccessGuard({ module, children }) {
  if (!hasModuleAccess(module)) {
    return <Navigate to="/access-denied" replace />;
  }
  return children;
}
