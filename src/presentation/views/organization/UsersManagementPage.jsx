import React, { useState, useEffect } from "react";
import { getOrganizationMembers, inviteOrganizationMember, updateOrganizationMember } from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField } from "../../components/auth/AuthFormPrimitives.jsx";
import FormDrawer from "../../components/layout/FormDrawer.jsx";
import { MdAdd, MdClose, MdShield, MdEdit } from "react-icons/md";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import {
  canInviteOrganizationMembers,
  canManageOrganizationMembers,
  canViewOrganizationMembers,
} from "../../../application/auth/orgScopes.js";

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
];

/** Stock permissions also cover size charts (single RBAC row). */
const STOCK_BUNDLED_RESOURCES = ["stocks", "sizeChart"];

/** Maps UI resource ids to backend scope tokens. */
function scopeToken(action, resourceId) {
  if (resourceId === "stocks" && action === "view") return "view_stock";
  return `${action}_${resourceId}`;
}

function parseScopeId(scopeId) {
  const sep = scopeId.indexOf("_");
  return { action: scopeId.slice(0, sep), resource: scopeId.slice(sep + 1) };
}

function bundledResources(resource) {
  if (resource === "stocks" || resource === "sizeChart") return STOCK_BUNDLED_RESOURCES;
  return [resource];
}

function scopeIsPresent(inviteScopes, action, resource) {
  if (inviteScopes.includes("all_scope")) return true;
  if (resource === "stocks" && action === "view" && inviteScopes.includes("view_stocks")) return true;
  return bundledResources(resource).some((r) => inviteScopes.includes(scopeToken(action, r)));
}

function removeScopeTokens(newScopes, action, resource) {
  let result = newScopes;
  for (const r of bundledResources(resource)) {
    const actionsToClear =
      action === "view" ? ["view", "edit", "manage"] : action === "edit" ? ["edit", "manage"] : ["manage"];
    for (const a of actionsToClear) {
      result = result.filter((s) => s !== scopeToken(a, r));
      if (r === "stocks" && a === "view") {
        result = result.filter((s) => s !== "view_stocks");
      }
    }
  }
  return result;
}

function addScopeTokens(newScopes, action, resource) {
  let result = [...newScopes];
  for (const r of bundledResources(resource)) {
    if (action === "manage") {
      for (const a of ["view", "edit", "manage"]) {
        const token = scopeToken(a, r);
        if (!result.includes(token)) result.push(token);
      }
    } else if (action === "edit") {
      for (const a of ["view", "edit"]) {
        const token = scopeToken(a, r);
        if (!result.includes(token)) result.push(token);
      }
    } else {
      const token = scopeToken("view", r);
      if (!result.includes(token)) result.push(token);
    }
  }
  return result;
}

function scopeCheckedForResource(inviteScopes, action, resource) {
  return scopeIsPresent(inviteScopes, action, resource);
}

export default function UsersManagementPage() {
  const { user } = useAuth();
  const canViewTeam = canViewOrganizationMembers(user);
  const canManageTeam = canManageOrganizationMembers(user);
  const canInvite = canInviteOrganizationMembers(user);
  
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
      if (inviteRole === "ADMIN" || inviteRole === "OWNER") return;

      let newScopes = [...inviteScopes].filter(s => s !== "all_scope");
      const { action, resource } = parseScopeId(scopeId);
      const isOn = scopeIsPresent(newScopes, action, resource);
      newScopes = isOn
        ? removeScopeTokens(newScopes, action, resource)
        : addScopeTokens(newScopes, action, resource);
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
    <div className="relative pb-12">
      {errorText && (
         <div className="mb-4 bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-200 flex gap-3 items-center">
            {errorText}
         </div>
      )}

      {!canViewTeam && (
         <div className="mb-4 bg-amber-50 p-3 text-sm font-semibold text-amber-900 border border-amber-200">
            You do not have permission to view the team roster.
         </div>
      )}

      {canViewTeam && !canManageTeam && (
         <div className="mb-4 bg-amber-50 p-3 text-sm font-semibold text-amber-900 border border-amber-200">
            View only — you can see team members but cannot invite or change access.
         </div>
      )}

      {!canViewTeam ? null : loading ? (
          <div className="flex justify-center p-20">
             <div className="w-8 h-8 border-2 border-gov-border border-t-gov-blue animate-spin"></div>
          </div>
      ) : (
          <div className="space-y-4">
             <div className="gov-panel">
                 <div className="gov-panel-header flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <h2 className="text-lg font-bold text-gray-900">Active Staff</h2>
                     <div className="flex items-center gap-3">
                         <span className="text-xs font-semibold text-gray-500 border border-gov-border px-2 py-1">{members.length} Total</span>
                         {canInvite && (
                         <button
                            onClick={openInviteModal}
                            className="gov-btn-primary"
                         >
                            <MdAdd className="w-4 h-4" />
                            Invite User
                         </button>
                         )}
                     </div>
                 </div>
                 
                 {members.length === 0 ? (
                     <div className="p-8 text-center text-gov-blue/40 font-medium">No personnel active.</div>
                 ) : (
                     <ul className="divide-y divide-gov-border">
                        {members.map(member => (
                            <li key={member.membershipId} className={`px-3 py-2 hover:bg-zinc-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${member.memberActive === false ? 'opacity-50 grayscale' : ''}`}>
                                <div className="flex items-center gap-3">
                                   <div className="relative">
                                     {member.photoUrl && !failedImages[member.membershipId] ? (
                                        <img 
                                           src={member.photoUrl} 
                                           alt="profile" 
                                           referrerPolicy="no-referrer"
                                           onError={() => setFailedImages(prev => ({ ...prev, [member.membershipId]: true }))}
                                           className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover" 
                                        />
                                     ) : (
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-navy text-white font-bold tracking-widest shadow-sm text-xs">
                                           {getInitials(member.displayName, member.email)}
                                        </div>
                                     )}
                                     <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${member.memberActive === false ? 'bg-red-500' : 'bg-gov-blue'}`}></div>
                                   </div>
                                   <div>
                                      <div className="text-sm font-bold text-gov-blue tracking-tight leading-tight">{member.displayName || "Unregistered Account"}</div>
                                      <div className="text-xs text-gov-blue/60 font-medium leading-tight">{member.email} {member.memberActive === false && <span className="text-red-500 font-bold ml-1">(Suspended)</span>}</div>
                                   </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2">
                                     <div className="flex items-center gap-1.5">
                                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${
                                             member.role === 'OWNER' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                             member.role === 'ADMIN' ? 'bg-brand-navy text-white' :
                                             member.role === 'MANAGER' ? 'bg-gov-blue-light text-gov-blue border border-gov-blue/20' :
                                             'bg-zinc-100 text-gov-blue/60 border border-zinc-200'
                                         }`}>
                                            {member.role === 'OWNER' && <MdShield className="w-3 h-3" />}
                                            {member.role}
                                         </span>
                                         
                                         {member.scopes.includes("all_scope") && (
                                             <span className="px-2 py-0.5 rounded-full bg-gov-blue/10 text-gov-blue border border-gov-blue/20 text-[10px] font-bold">
                                                ALL PERMISSIONS
                                             </span>
                                         )}
                                     </div>

                                     {canManageTeam && (
                                     <button 
                                        onClick={() => openEditModal(member)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gov-blue hover:bg-gray-50 transition-colors shrink-0"
                                        title="Edit User Access"
                                     >
                                         <MdEdit className="w-4 h-4" />
                                     </button>
                                     )}
                                </div>
                            </li>
                        ))}
                     </ul>
                 )}
             </div>

             {/* Pending Invitations Subgrid */}
             {pending.length > 0 && (
                 <div className="gov-panel">
                     <div className="gov-panel-header flex items-center justify-between bg-orange-50">
                         <h2 className="text-lg font-bold text-orange-800">Pending Invitations</h2>
                         <span className="text-xs font-semibold text-orange-800 border border-orange-200 px-2 py-1">{pending.length} Waiting</span>
                     </div>
                     <ul className="divide-y divide-gov-border">
                        {pending.map(invite => (
                            <li key={invite.invitationId} className="px-3 py-2 hover:bg-zinc-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3 opacity-60">
                                   <div className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 text-orange-800 font-bold tracking-widest shadow-sm text-xs">
                                       {getInitials(null, invite.emailNormalized)}
                                   </div>
                                   <div>
                                      <div className="text-sm font-bold text-gov-blue tracking-tight leading-tight">{invite.emailNormalized}</div>
                                      <div className="text-[10px] text-orange-600 font-semibold">Activation required</div>
                                   </div>
                                </div>
                                <span className="opacity-60 px-2 py-0.5 rounded-full bg-zinc-100 text-gov-blue/60 text-[10px] font-bold uppercase tracking-wide border border-zinc-200">
                                    PENDING {invite.role}
                                </span>
                            </li>
                        ))}
                     </ul>
                 </div>
             )}
          </div>
      )}

      <FormDrawer
        open={!!modalMode}
        onClose={closeModal}
        disableClose={inviteBusy}
        maxWidth="max-w-2xl"
        title={modalMode === "invite" ? "Invite User" : "Edit User Access"}
        subtitle={modalMode === "invite" ? "Add a new member and set permissions." : "Modify privileges and access boundaries."}
        icon={<MdShield className="w-4 h-4" />}
        footer={
          <>
            <button type="button" onClick={closeModal} disabled={inviteBusy} className="gov-btn-secondary">Cancel</button>
            <PrimaryButton onClick={handleSubmit} disabled={inviteBusy || !!inviteSuccess || !inviteEmail.includes("@") || inviteScopes.length === 0}>
              {inviteBusy ? "Processing..." : modalMode === "invite" ? "Send Invitation" : "Update Privileges"}
            </PrimaryButton>
          </>
        }
      >
                      {inviteError && (
                          <div className="bg-red-50 p-3 font-semibold text-red-600 border border-red-200 text-sm">
                             {inviteError}
                          </div>
                      )}
                      {inviteSuccess && (
                          <div className="bg-gov-blue-light/20 p-3 font-semibold text-gov-blue border border-gov-border flex gap-3 text-sm">
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
                          <div className="flex items-center justify-between p-5 bg-gray-50 border border-gov-border">
                              <div>
                                  <div className="font-bold text-sm text-gov-blue">Account Status</div>
                                  <div className="text-xs text-gov-blue/60 mt-0.5">Toggle to suspend or reactivate this user's cross-tenant access.</div>
                              </div>
                              <button 
                                 onClick={() => setMemberActive(!memberActive)}
                                 disabled={inviteBusy || !!inviteSuccess}
                                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${memberActive ? 'bg-gov-blue' : 'bg-brand-navy/20'}`}
                              >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${memberActive ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                          </div>
                      )}
                      
                      <div>
                          <label className="block text-sm font-bold text-gov-blue mb-3">User Role</label>
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
                                          className={`px-4 py-3 border-2 text-sm font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 ${
                                              (inviteRole === role) || (isOwner && role === "ADMIN")
                                              ? 'border-gov-blue bg-blue-50 text-gov-blue' 
                                              : 'border-gov-border text-gov-blue/60 hover:bg-gray-50'
                                          }`}
                                      >
                                          {renderRoleValue}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="border-t border-gov-blue/10 pt-8 mt-8">
                          <label className="block text-sm font-bold text-gov-blue mb-1">Detailed Permissions</label>
                          <p className="text-xs text-gov-blue/50 mb-4 font-medium">Fine-tune the exact read/write permissions mapped to their account.</p>
                          
                          {inviteRole === "ADMIN" || inviteRole === "OWNER" ? (
                              <div className="p-6 bg-gray-50 border border-gov-border flex items-center justify-center flex-col gap-2">
                                  <MdShield className="w-8 h-8 text-gov-blue/40" />
                                  <div className="font-bold text-gov-blue text-center">{inviteRole === "OWNER" ? "Owners" : "Admins"} have unrestricted global access.</div>
                                  <div className="text-xs text-gov-blue/60 text-center">Specific permissions are automatically overridden.</div>
                              </div>
                          ) : (
                              <div className="space-y-2">
                                 {RESOURCE_SCOPES.map(resource => (
                                     <div key={resource.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gov-border bg-gray-50 gap-4">
                                         <div className="font-bold text-sm text-gov-blue w-1/3">
                                            {resource.title}
                                            {resource.id === "stocks" && (
                                              <div className="text-[10px] font-medium text-gov-blue/50 normal-case tracking-normal mt-0.5">Includes size charts</div>
                                            )}
                                            {resource.id === "quotes" && (
                                              <div className="text-[10px] font-medium text-gov-blue/50 normal-case tracking-normal mt-0.5">Includes read access to stock, printers &amp; customers for quoting</div>
                                            )}
                                         </div>
                                         <div className="flex flex-wrap items-center gap-6">
                                            {resource.actions.map(action => {
                                                const scopeId = `${action}_${resource.id}`;
                                                const isChecked = scopeCheckedForResource(inviteScopes, action, resource.id);
                                                
                                                return (
                                                    <label 
                                                       key={scopeId} 
                                                       className={`flex items-center gap-2 cursor-pointer group ${inviteBusy || !!inviteSuccess ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        <div 
                                                          onClick={(e) => { e.preventDefault(); handleScopeToggle(scopeId); }}
                                                          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                                            isChecked ? 'bg-gov-blue border-gov-blue text-white' : 'border-zinc-300 group-hover:border-gov-blue/50 bg-white'
                                                        }`}>
                                                            {isChecked && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                                        </div>
                                                        <span 
                                                          onClick={(e) => { e.preventDefault(); handleScopeToggle(scopeId); }}
                                                          className={`text-[10px] font-bold uppercase tracking-widest ${isChecked ? 'text-gov-blue' : 'text-gov-blue/50'}`}
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
      </FormDrawer>
    </div>
  );
}
