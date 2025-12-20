// src/components/group/CreateList.jsx
import React, { useState } from "react";
import { Plus } from "lucide-react";
import CreateListModal from "./CreateListModal";

export default function CreateList({ activeGroup, groupName, reload }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Button zum Öffnen des Modals */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-white p-4 rounded-2xl shadow-sm border border-stone-100 hover:border-amber-300 hover:shadow-md transition flex items-center justify-center gap-2 text-stone-600 hover:text-amber-600"
      >
        <Plus size={20} />
        <span className="font-medium">Neue Liste anlegen</span>
      </button>

      {/* Modal */}
      <CreateListModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        activeGroup={activeGroup}
        groupName={groupName}
        reload={reload}
      />
    </>
  );
}
