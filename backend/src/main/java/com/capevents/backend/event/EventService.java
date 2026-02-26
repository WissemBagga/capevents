package com.capevents.backend.event;

import com.capevents.backend.config.BadRequestException;
import com.capevents.backend.config.NotFoundException;
import com.capevents.backend.event.dto.CreateEventRequest;
import com.capevents.backend.event.dto.EventResponse;
import com.capevents.backend.event.dto.UpdateEventRequest;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Service
public class EventService {
    private final EventRepository eventRepository;
    private final UserRepository userRepository;


    public EventService(EventRepository eventRepository, UserRepository userRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public EventResponse createDraftEvent(CreateEventRequest req, String creatorEmail){
        validateBusiness(req);

        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(()-> new NotFoundException("Creator user not found"));
        Event e = new Event();
        e.setTitle(req.title());
        e.setCategory(req.category());
        e.setDescription(req.description());
        e.setStartAt(req.startAt());
        e.setDurationMinutes(req.durationMinutes());
        e.setLocationType(req.locationType());
        e.setLocationName(req.locationName());
        e.setMeetingUrl(req.meetingUrl());
        e.setAddress(req.address());
        e.setCapacity(req.capacity());
        e.setRegistrationDeadline(req.registrationDeadline());
        e.setStatus(EventStatus.DRAFT);
        e.setCreatedBy(creator);
        e.setImageUrl(req.imageUrl());

        Event saved = eventRepository.save(e);
        return toResponse(saved);
    }

    @Transactional
    public EventResponse publish(UUID eventId){
        Event e = eventRepository.findById(eventId)
                .orElseThrow(()-> new NotFoundException("Event not found"));

        if (e.getStatus() == EventStatus.ARCHIVED || e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Cannot publish an archived or cancelled event");
        }

        if (e.getStartAt().isBefore(Instant.now())){
            throw new BadRequestException("Cannot publish an event that has already started");
        }
        e.setStatus(EventStatus.PUBLISHED);
        return  toResponse(e);
    }

    @Transactional(readOnly = true)
    public List<EventResponse> listPublishedUpcoming(){
        List<Event> events = eventRepository.findByStatusAndStartAtAfterOrderByCreatedAtAsc(
                EventStatus.PUBLISHED,
                Instant.now()
        );
        List<EventResponse> responses = new ArrayList<>();

        for (Event e : events) {
            responses.add(toResponse(e));
        }
        return responses;
    }




    @Transactional(readOnly = true)
    public EventResponse getPublishedById(UUID id){
        Event e = eventRepository.findById(id)
                .orElseThrow(()-> new NotFoundException("Event not found"));

        if (e.getStatus() != EventStatus.PUBLISHED){
            throw new NotFoundException("Event not found"); // pour chachee les non-published
        }
        return toResponse(e);
    }

    @Transactional(readOnly = true)
    public List<EventResponse> listAllForHr(){
        List<Event> events = eventRepository.findAllByOrderByCreatedAtDesc();
        List<EventResponse> responses = new ArrayList<>();

        for (Event e : events) {
            responses.add(toResponse(e));
        }
        return responses;

        // ou on peut faire par autre methode return eventRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();

    }


    @Transactional
    public EventResponse update(UUID id, UpdateEventRequest req){
        validateBusinessForUpdate(req);

        Event e = eventRepository.findById(id)
                .orElseThrow(()-> new NotFoundException("Event not found"));

        if (e.getStatus() == EventStatus.ARCHIVED || e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Cannot update an archived or cancelled event");
        }

        e.setTitle(req.title());
        e.setCategory(req.category());
        e.setDescription(req.description());
        e.setStartAt(req.startAt());
        e.setDurationMinutes(req.durationMinutes());
        e.setLocationType(req.locationType());
        e.setLocationName(req.locationName());
        e.setMeetingUrl(req.meetingUrl());
        e.setAddress(req.address());
        e.setCapacity(req.capacity());
        e.setRegistrationDeadline(req.registrationDeadline());
        e.setImageUrl(req.imageUrl());

        return toResponse(e);
    }

    @Transactional
    public EventResponse cancel(UUID id, String reason){
        Event e = eventRepository.findById(id)
                .orElseThrow(()-> new NotFoundException("Event not found"));
        if (e.getStatus() == EventStatus.ARCHIVED){
            throw new BadRequestException("Event already archived");
        }

        if (e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Event already cancelled");
        }
        e.setStatus(EventStatus.CANCELLED);
        e.setCancelReason(reason);
        return toResponse(e);
    }


    @Transactional
    public EventResponse archive(UUID id){
        Event e = eventRepository.findById(id)
                .orElseThrow(()-> new NotFoundException("Event not found"));
        if (e.getStatus() == EventStatus.ARCHIVED){
            throw new BadRequestException("Event already archived");
        }
        e.setStatus(EventStatus.ARCHIVED);
        return toResponse(e);
    }


    @Transactional(readOnly = true)
    public List<EventResponse> searchPublished(String category) {
        List<Event> events = eventRepository.searchPublished(Instant.now(), category);
        List<EventResponse> responses = new ArrayList<>();
        for (Event e : events){
            responses.add(toResponse(e));
        }
        return responses;
    }

    private void validateBusiness(CreateEventRequest req){
        if (req.registrationDeadline().isAfter(req.startAt()) || req.registrationDeadline().equals(req.startAt())){
            throw new BadRequestException("Registration deadline must be before event start time");
        }
        if (req.startAt().isBefore(Instant.now())){
            throw new BadRequestException("Event start time must be in the future");
        }
        if (req.locationType() == EventLocationType.ONLINE && (req.meetingUrl() == null || req.meetingUrl().isBlank())){
            throw new BadRequestException("Meeting URL is required for ONLINE events");
        }
        if (req.locationType() == EventLocationType.ONSITE && (req.locationName() == null || req.locationName().isBlank())){
            throw new BadRequestException("Location name is required for ONSITE events");
        }
    }


    private void validateBusinessForUpdate(UpdateEventRequest req){
        if (!req.registrationDeadline().isBefore(req.startAt())){
            throw new BadRequestException("Registration deadline must be before event start time");
        }

        if (req.locationType() == EventLocationType.ONLINE && (req.meetingUrl() == null || req.meetingUrl().isBlank())){
            throw new BadRequestException("Meeting URL is required for ONLINE events");
        }

        if (req.locationType() == EventLocationType.ONSITE && (req.locationName() == null || req.locationName().isBlank())){
            throw new BadRequestException("Location name is required for ONSITE events");
        }
    }
    private EventResponse toResponse(Event e){
        String email = null;
        if (e.getCreatedBy() != null) {
            email = e.getCreatedBy().getEmail();
        }

        return new EventResponse(
                e.getId(),
                e.getTitle(),
                e.getCategory(),
                e.getDescription(),
                e.getStartAt(),
                e.getDurationMinutes(),
                e.getLocationType(),
                e.getLocationName(),
                e.getMeetingUrl(),
                e.getAddress(),
                e.getCapacity(),
                e.getRegistrationDeadline(),
                e.getStatus(),
                email,
                e.getCreatedAt(),
                e.getUpdatedAt(),
                e.getImageUrl()
        );
    }

}
