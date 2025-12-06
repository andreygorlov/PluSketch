import { useProjectStore } from '../../store';
import ElementEditor from '../forms/ElementEditor';
import ElementForm from '../forms/ElementForm';
import { ElementType } from '../../types/element';

export default function Sidebar() {
  const { selectedElementIds, creatingElementType, setCreatingElementType } = useProjectStore();
  const selectedElementId = selectedElementIds.length > 0 ? selectedElementIds[0] : null;

  const handleCreateClick = (type: ElementType) => {
    setCreatingElementType(type);
  };

  const handleFormClose = () => {
    setCreatingElementType(null);
  };

  const handleFormSave = () => {
    setCreatingElementType(null);
  };

  return (
    <div className="w-[10cm] bg-gray-100 border-l border-gray-300 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {creatingElementType ? (
          <ElementForm
            initialType={creatingElementType}
            onClose={handleFormClose}
            onSave={handleFormSave}
          />
        ) : selectedElementId ? (
          <ElementEditor />
        ) : (
          <div className="space-y-4">
            <div className="mt-8 pt-6 text-center">
              <p className="text-xs text-gray-400">לחץ על אלמנט קיים כדי לערוך</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
