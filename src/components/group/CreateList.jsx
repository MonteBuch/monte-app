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
        className="w-full bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-md transition flex items-center justify-center gap-2 text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400"
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
