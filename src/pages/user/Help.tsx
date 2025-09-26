import UserLayout from "@/layouts/UserLayout";
import { useState } from "react";
import HelpForm from "@/components/help/HelpForm";
import IssueSubmittedDialog from "@/components/help/IssueSubmittedDialog";
import SearchBar from "@/components/shared/SearchBar";


export default function Help() {
  const [showSubmitted, setShowSubmitted] = useState(false);

  const handleFormSubmit = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 600));
    setShowSubmitted(true);
  };


  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Help and Support
          </h1>
          <SearchBar />
        </div>
        
        <HelpForm onSubmit={handleFormSubmit} />
        
        <IssueSubmittedDialog 
          open={showSubmitted} 
          onOpenChange={setShowSubmitted} 
        />
      </div>
    </UserLayout>
  );
}
