import React, { useState, useEffect } from "react";
import { getOrganizationMembers, inviteOrganizationMember, updateOrganizationMember } from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField } from "../../components/auth/AuthFormPrimitives.jsx";
import { MdAdd, MdClose, MdShield, MdEdit } from "react-icons/md";
import { useAuth } from "../../../application/hooks/useAuth.jsx";

function getInitials(name, email) {
  if (name) {
      const parts = name.split(" ").filter((n) => n.length > 0);
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email ? email.substring(0, 2).toUpperCase() : "??";
}

const RESOURCE_SCOPES = [
   { id: "dashboard", title: "Dashboard", actions: ["view"] },
   { id: "customers", title: "Customers", actions: ["view", "edit", "manage"] },
   { id: "quotes", title: "Quotations", actions: ["view", "edit", "manage"] },
   { id: "invoices", title: "Invoices", actions: ["view", "edit", "manage"] },
   { id: "jobs", title: "Jobs", actions: ["view", "edit", "manage"] },
   { id: "users", title: "Users", actions: ["view", "edit", "manage"] },
   { id: "printers", title: "Printer & Plates", actions: ["view", "edit", "manage"] },
   { id: "stocks", title: "Paper & Stock", actions: ["view", "edit", "manage"] },
   { id: "sizeChart", title: "Size Charts", actions: ["view", "edit", "manage"] },
];

export default function UsersManagementPage() {
  const { user } = useAuth();
  
  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [modalMode, setModalMode] = useState(null); // null, 'invite', 'edit'
  const [editMemberId, setEditMemberId] = useState(null);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteScopes, setInviteScopes] = useState(["view_dashboard"]);
  const [memberActive, setMemberActive] = useState(true);

  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [failedImages, setFailedImages] = useState({});

  async function fetchRoster() {
      setLoading(true);
      setErrorText("");
      try {
         const data = await getOrganizationMembers();
         setMembers(data.members || []);
         setPending(data.pendingInvitations || []);
      } catch (e) {
         setErrorText(e.response?.data?.message || "Failed to load team roster from the backend.");
      } finally {
         setLoading(false);
      }
  }

  useEffect(() => {
      fetchRoster();
  }, []);

  function handleScopeToggle(scopeId) {
      if (inviteRole === "ADMIN" || inviteRole === "OWNER") return; // Natively blocked by UI
      
      let newScopes = [...inviteScopes].filter(s => s !== "all_scope");
      
      if (newScopes.includes(scopeId)) {
          newScopes = newScopes.filter(s => s !== scopeId);
      } else {
          newScopes.push(scopeId);
          // Smart cascade logic
          const [action, resource] = scopeId.split('_');
          if (action === "manage") {
              if (!newScopes.includes(`view_${resource}`)) newScopes.push(`view_${resource}`);
              if (!newScopes.includes(`edit_${resource}`)) newScopes.push(`edit_${resource}`);
          }
          if (action === "edit") {
              if (!newScopes.includes(`view_${resource}`)) newScopes.push(`view_${resource}`);
          }
      }
      setInviteScopes(newScopes);
  }

  useEffect(() => {
      if (modalMode === "edit") return; // Do not auto-override during edit load
      if (inviteRole === "ADMIN" || inviteRole === "OWNER") {
          setInviteScopes(["all_scope"]);
      } else if (inviteRole === "MANAGER") {
          setInviteScopes([
             "view_dashboard", 
             "view_customers", "edit_customers", "manage_customers",
             "view_quotes", "edit_quotes", "manage_quotes",
             "view_jobs", "edit_jobs", "manage_jobs"
          ]);
      } else {
          setInviteScopes(["view_dashboard"]);
      }
  }, [inviteRole, modalMode]);

  function openInviteModal() {
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteScopes(["view_dashboard"]);
      setMemberActive(true);
      setInviteBusy(false);
      setInviteError("");
      setInviteSuccess("");
      setModalMode("invite");
  }

  function openEditModal(member) {
      setEditMemberId(member.membershipId);
      setInviteEmail(member.email || member.emailNormalized || "");
      setInviteRole(member.role);
      setInviteScopes(member.scopes || []);
      setMemberActive(member.memberActive !== false);
      setInviteBusy(false);
      setInviteError("");
      setInviteSuccess("");
      setModalMode("edit");
  }

  function closeModal() {
      if (inviteBusy) return;
      setModalMode(null);
  }

  async function handleSubmit() {
      setInviteBusy(true);
      setInviteError("");
      setInviteSuccess("");

      try {
          if (modalMode === "invite") {
              const payload = {
                  email: inviteEmail.trim(),
                  role: inviteRole,
                  scopes: inviteScopes.length > 0 ? inviteScopes : ["view_dashboard"]
              };
              const response = await inviteOrganizationMember(payload);
              
              if (response.code === "INVITATION_PENDING") {
                  setInviteSuccess("Invitation securely sent! The system will bind their account once they sign in.");
              } else if (response.code === "MEMBER_CREATED") {
                  setInviteSuccess("User was located and seamlessly added to your organization.");
              } else {
                  setInviteSuccess("User added successfully.");
              }
          } else {
              // Edit mode
              const payload = {
                  scopes: inviteScopes.length > 0 ? inviteScopes : ["view_dashboard"]
              };
              
              // Only push role and memberActive if they aren't the OWNER
              if (inviteRole !== "OWNER") {
                  payload.role = inviteRole;
                  payload.memberActive = memberActive;
              }

              await updateOrganizationMember(editMemberId, payload);
              setInviteSuccess("User access privileges updated successfully.");
          }
          
          fetchRoster();
          
          setTimeout(() => {
              closeModal();
          }, 2000);

      } catch (e) {
          if (e.response?.status === 409) {
              setInviteError("That user is already active inside this organization.");
          } else {
              setInviteError(e.response?.data?.message || `Failed to ${modalMode} the user.`);
          }
      } finally {
          setInviteBusy(false);
      }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in relative pb-12">
      {/* Header Array */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-brand-navy tracking-tight">Organization Members</h1>
           <p className="mt-2 text-brand-navy/60">
              Manage operators and invite collaborators cleanly isolated into this domain.
           </p>
        </div>
        <button 
           onClick={openInviteModal}
           className="flex items-center gap-2 px-6 py-3 bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95"
        >
           <MdAdd className="w-5 h-5" />
           Invite User
        </button>
      </div>

      {errorText && (
         <div className="mb-8 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100 flex gap-3 items-center">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            {errorText}
         </div>
      )}

      {loading ? (
          <div className="flex justify-center p-20">
             <div className="w-10 h-10 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
          </div>
      ) : (
          <div className="space-y-8">
             {/* Active Members Grid Row List */}
             <div className="bg-white rounded-2xl border border-brand-navy/5 shadow-sm overflow-hidden">
                 <div className="px-6 py-4 border-b border-brand-navy/5 flex items-center justify-between bg-zinc-50/50">
                     <h2 className="font-bold text-brand-navy">Active Staff</h2>
                     <span className="bg-brand-navy/5 text-brand-navy font-bold text-xs px-3 py-1 rounded-full">{members.length} Total</span>
                 </div>
                 
                 {members.length === 0 ? (
                     <div className="p-8 text-center text-brand-navy/40 font-medium">No personnel active.</div>
                 ) : (
                     <ul className="divide-y divide-brand-navy/5">
                        {members.map(member => (
                            <li key={member.membershipId} className={`p-6 hover:bg-zinc-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${member.memberActive === false ? 'opacity-50 grayscale' : ''}`}>
                                <div className="flex items-center gap-4">
                                   <div className="relative">
                                     {member.photoUrl && !failedImages[member.membershipId] ? (
                                        <img 
                                           src={member.photoUrl} 
                                           alt="profile" 
                                           referrerPolicy="no-referrer"
                                           onError={() => setFailedImages(prev => ({ ...prev, [member.membershipId]: true }))}
                                           className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" 
                                        />
                                     ) : (
                                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-navy text-white font-bold tracking-widest shadow-sm text-sm">
                                           {getInitials(member.displayName, member.email)}
                                        </div>
                                     )}
                                     <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${member.memberActive === false ? 'bg-red-500' : 'bg-brand-teal'}`}></div>
                                   </div>
                                   <div>
                                      <div className="font-bold text-brand-navy tracking-tight">{member.displayName || "Unregistered Account"}</div>
                                      <div className="text-sm text-brand-navy/60 font-medium">{member.email} {member.memberActive === false && <span className="text-red-500 font-bold ml-1">(Suspended)</span>}</div>
                                   </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-4">
                                     <div className="flex items-center gap-2">
                                         <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
                                             member.role === 'OWNER' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                             member.role === 'ADMIN' ? 'bg-brand-navy text-white' :
                                             member.role === 'MANAGER' ? 'bg-brand-mint text-brand-teal border border-brand-teal/20' :
                                             'bg-zinc-100 text-brand-navy/60 border border-zinc-200'
                                         }`}>
                                            {member.role === 'OWNER' && <MdShield className="w-3 h-3" />}
                                            {member.role}
                                         </span>
                                         
                                         {member.scopes.includes("all_scope") && (
                                             <span className="px-3 py-1.5 rounded-full bg-brand-teal/10 text-brand-teal border border-brand-teal/20 text-xs font-bold">
                                                ALL PERMISSIONS
                                             </span>
                                         )}
                                     </div>

                                     {/* Edit Access Action Button */}
                                     <button 
                                        onClick={() => openEditModal(member)}
                                        className="w-10 h-10 flex items-center justify-center text-brand-navy/40 hover:text-brand-navy hover:bg-brand-navy/5 rounded-full transition-colors flex-shrink-0"
                                        title="Edit User Access"
                                     >
                                         <MdEdit className="w-5 h-5" />
                                     </button>
                                </div>
                            </li>
                        ))}
                     </ul>
                 )}
             </div>

             {/* Pending Invitations Subgrid */}
             {pending.length > 0 && (
                 <div className="bg-white rounded-2xl border border-brand-navy/5 shadow-sm overflow-hidden">
                     <div className="px-6 py-4 border-b border-brand-navy/5 flex items-center justify-between bg-orange-50/50">
                         <h2 className="font-bold text-orange-800">Pending Invitations</h2>
                         <span className="bg-orange-100 text-orange-800 border border-orange-200 font-bold text-xs px-3 py-1 rounded-full">{pending.length} Waiting</span>
                     </div>
                     <ul className="divide-y divide-brand-navy/5">
                        {pending.map(invite => (
                            <li key={invite.invitationId} className="p-6 hover:bg-zinc-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 opacity-60">
                                   <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-800 font-bold tracking-widest shadow-sm">
                                       {getInitials(null, invite.emailNormalized)}
                                   </div>
                                   <div>
                                      <div className="font-bold text-brand-navy tracking-tight">{invite.emailNormalized}</div>
                                      <div className="text-xs text-orange-600 font-semibold mt-0.5">Activation required</div>
                                   </div>
                                </div>
                                <span className="opacity-60 px-4 py-1.5 rounded-full bg-zinc-100 text-brand-navy/60 text-xs font-bold uppercase tracking-widest border border-zinc-200">
                                    PENDING {invite.role}
                                </span>
                            </li>
                        ))}
                     </ul>
                 </div>
             )}
          </div>
      )}

      {/* Invite/Edit Modal Layer */}
      {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <div 
                 className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm transition-opacity" 
                 onClick={closeModal}
              ></div>
              
              {/* Panel */}
              <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-fade-in">
                  
                  <div className="p-6 border-b border-brand-navy/5 flex justify-between items-center">
                      <div>
                         <h2 className="text-2xl font-bold text-brand-navy">
                            {modalMode === 'invite' ? "Invite User" : "Edit User Access"}
                         </h2>
                         <p className="text-sm text-brand-navy/60 font-medium">
                            {modalMode === 'invite' ? "Add a new member to your organization and set their permissions." : "Modify privileges and strict access boundaries for this network node."}
                         </p>
                      </div>
                      <button 
                         onClick={closeModal} 
                         className="w-10 h-10 rounded-full flex items-center justify-center text-brand-navy/40 hover:bg-zinc-100 hover:text-brand-navy transition-colors focus:outline-none"
                      >
                          <MdClose className="w-6 h-6" />
                      </button>
                  </div>

                  <div className="overflow-y-auto p-6 md:p-8 flex-1 space-y-8 no-scrollbar">
                      {inviteError && (
                          <div className="rounded-xl bg-red-50 p-4 font-semibold text-red-600 border border-red-100 text-sm">
                             {inviteError}
                          </div>
                      )}
                      {inviteSuccess && (
                          <div className="rounded-xl bg-brand-mint/20 p-4 font-semibold text-brand-teal border border-brand-mint/50 flex gap-3 text-sm">
                             {inviteSuccess}
                          </div>
                      )}

                      <TextField
                          label="Email Address"
                          placeholder="operator@printq.io"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={modalMode === "edit" || inviteBusy || !!inviteSuccess}
                      />

                      {/* Suspension Toggle visible only in Edit Mode implicitly locked for Owners */}
                      {modalMode === 'edit' && inviteRole !== 'OWNER' && (
                          <div className="flex items-center justify-between p-5 bg-brand-navy/5 rounded-2xl border border-brand-navy/10">
                              <div>
                                  <div className="font-bold text-sm text-brand-navy">Account Status</div>
                                  <div className="text-xs text-brand-navy/60 mt-0.5">Toggle to suspend or reactivate this user's cross-tenant access.</div>
                              </div>
                              <button 
                                 onClick={() => setMemberActive(!memberActive)}
                                 disabled={inviteBusy || !!inviteSuccess}
                                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${memberActive ? 'bg-brand-teal' : 'bg-brand-navy/20'}`}
                              >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${memberActive ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                          </div>
                      )}
                      
                      <div>
                          <label className="block text-sm font-bold text-brand-navy mb-3">User Role</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {['ADMIN', 'MANAGER', 'MEMBER'].map((role) => {
                                  const isOwner = inviteRole === "OWNER";
                                  const renderRoleValue = isOwner && role === "ADMIN" ? "OWNER" : role;
                                  
                                  // Masking role selection completely if editing an Owner node
                                  if (isOwner && role !== "ADMIN") return null;

                                  return (
                                      <button
                                          key={role}
                                          disabled={inviteBusy || !!inviteSuccess || isOwner}
                                          onClick={() => setInviteRole(role)}
                                          className={`px-4 py-3 rounded-xl border-2 text-sm font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 ${
                                              (inviteRole === role) || (isOwner && role === "ADMIN")
                                              ? 'border-brand-teal bg-brand-mint/5 text-brand-teal shadow-md shadow-brand-teal/10' 
                                              : 'border-brand-navy/10 text-brand-navy/60 hover:border-brand-navy/20 hover:bg-zinc-50'
                                          }`}
                                      >
                                          {renderRoleValue}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="border-t border-brand-navy/10 pt-8 mt-8">
                          <label className="block text-sm font-bold text-brand-navy mb-1">Detailed Permissions</label>
                          <p className="text-xs text-brand-navy/50 mb-4 font-medium">Fine-tune the exact read/write permissions mapped to their account.</p>
                          
                          {inviteRole === "ADMIN" || inviteRole === "OWNER" ? (
                              <div className="p-6 bg-brand-navy/5 rounded-2xl border border-brand-navy/10 flex items-center justify-center flex-col gap-2">
                                  <MdShield className="w-8 h-8 text-brand-navy/40" />
                                  <div className="font-bold text-brand-navy text-center">{inviteRole === "OWNER" ? "Owners" : "Admins"} have unrestricted global access.</div>
                                  <div className="text-xs text-brand-navy/60 text-center">Specific permissions are automatically overridden.</div>
                              </div>
                          ) : (
                              <div className="space-y-2">
                                 {RESOURCE_SCOPES.map(resource => (
                                     <div key={resource.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-brand-navy/5 bg-zinc-50/50 gap-4">
                                         <div className="font-bold text-sm text-brand-navy w-1/3">{resource.title}</div>
                                         <div className="flex flex-wrap items-center gap-6">
                                            {resource.actions.map(action => {
                                                const scopeId = `${action}_${resource.id}`;
                                                const isChecked = inviteScopes.includes(scopeId) || inviteScopes.includes("all_scope");
                                                
                                                return (
                                                    <label 
                                                       key={scopeId} 
                                                       className={`flex items-center gap-2 cursor-pointer group ${inviteBusy || !!inviteSuccess ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        <div 
                                                          onClick={(e) => { e.preventDefault(); handleScopeToggle(scopeId); }}
                                                          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                                            isChecked ? 'bg-brand-teal border-brand-teal text-white' : 'border-zinc-300 group-hover:border-brand-teal/50 bg-white'
                                                        }`}>
                                                            {isChecked && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                                        </div>
                                                        <span 
                                                          onClick={(e) => { e.preventDefault(); handleScopeToggle(scopeId); }}
                                                          className={`text-[10px] font-bold uppercase tracking-widest ${isChecked ? 'text-brand-navy' : 'text-brand-navy/50'}`}
                                                        >
                                                           {action}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                         </div>
                                     </div>
                                 ))}
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="p-6 border-t border-brand-navy/5 bg-zinc-50/50 rounded-b-[2rem] flex justify-end gap-3">
                      <button 
                         onClick={closeModal}
                         disabled={inviteBusy}
                         className="px-6 py-2.5 font-semibold text-brand-navy/60 hover:text-brand-navy hover:bg-zinc-200/50 rounded-xl transition-all"
                      >
                         Cancel
                      </button>
                      <PrimaryButton onClick={handleSubmit} disabled={inviteBusy || !!inviteSuccess || !inviteEmail.includes('@') || inviteScopes.length === 0}>
                         {inviteBusy ? "Processing..." : (modalMode === 'invite' ? "Send Invitation" : "Update Privileges")}
                      </PrimaryButton>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
